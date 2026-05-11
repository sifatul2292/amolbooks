import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class MetaAdsService {
  private readonly logger = new Logger(MetaAdsService.name);

  constructor(
    @InjectModel('AdSpend') private readonly adSpendModel: Model<any>,
    @InjectModel('Expense') private readonly expenseModel: Model<any>,
    @InjectModel('Setting') private readonly settingModel: Model<any>,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  // ─── OAuth ───────────────────────────────────────────────────────────────────

  getAuthUrl(): string {
    const appId = this.configService.get<string>('META_APP_ID');
    const redirectUri = this.configService.get<string>('META_REDIRECT_URI');
    if (!appId || !redirectUri) {
      throw new BadRequestException('META_APP_ID or META_REDIRECT_URI not configured');
    }
    const scope = 'ads_read';
    return `https://www.facebook.com/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code`;
  }

  async handleOAuthCallback(code: string): Promise<any> {
    const appId = this.configService.get<string>('META_APP_ID');
    const appSecret = this.configService.get<string>('META_APP_SECRET');
    const redirectUri = this.configService.get<string>('META_REDIRECT_URI');

    if (!appId || !appSecret || !redirectUri) {
      throw new BadRequestException('Meta OAuth credentials not configured');
    }

    try {
      // Exchange code for access token
      const tokenUrl = `https://graph.facebook.com/v22.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`;
      const tokenRes = await firstValueFrom(this.httpService.get(tokenUrl));
      const accessToken: string = tokenRes.data.access_token;

      // Fetch ad accounts for this token
      const accountsRes = await firstValueFrom(
        this.httpService.get(`https://graph.facebook.com/v22.0/me/adaccounts?fields=id,name&access_token=${accessToken}`),
      );
      const accounts = accountsRes.data?.data || [];
      const firstAccountId = accounts[0]?.id || null;

      // Persist in settings
      await this.settingModel.findOneAndUpdate(
        {},
        {
          $set: {
            'metaAds.accessToken': accessToken,
            'metaAds.adAccountId': firstAccountId,
            'metaAds.isConnected': true,
          },
        },
        { upsert: true },
      );

      return { success: true, adAccounts: accounts };
    } catch (err) {
      this.logger.error('Meta OAuth callback error', err?.response?.data || err.message);
      throw new InternalServerErrorException('Failed to complete Facebook OAuth');
    }
  }

  // ─── Status ──────────────────────────────────────────────────────────────────

  async getStatus(): Promise<any> {
    const setting = await this.settingModel.findOne({}).lean();
    const meta = (setting as any)?.metaAds || {};
    return {
      isConnected: meta.isConnected || false,
      adAccountId: meta.adAccountId || null,
      lastSyncAt: meta.lastSyncAt || null,
      exchangeRate: meta.exchangeRate || 130,
    };
  }

  // ─── Sync from Meta Marketing API ────────────────────────────────────────────

  async syncAdSpend(startDate: string, endDate: string): Promise<any> {
    const setting = await this.settingModel.findOne({}).lean();
    const meta = (setting as any)?.metaAds || {};

    if (!meta.isConnected || !meta.accessToken || !meta.adAccountId) {
      throw new BadRequestException('Meta Ads not connected. Use /meta-ads/auth-url to connect.');
    }

    const exchangeRate = meta.exchangeRate || 130;
    const adAccountId = meta.adAccountId;
    const accessToken = meta.accessToken;

    try {
      const url = `https://graph.facebook.com/v22.0/${adAccountId}/insights`;
      const params = {
        fields: 'spend,campaign_name,date_start',
        time_range: JSON.stringify({ since: startDate, until: endDate }),
        level: 'campaign',
        time_increment: 1,
        access_token: accessToken,
      };

      const res = await firstValueFrom(this.httpService.get(url, { params }));
      const rows: any[] = res.data?.data || [];

      // Group by date — Meta reports spend in BDT for BD accounts, no conversion needed
      const byDate: Record<string, { spendBDT: number; campaigns: any[] }> = {};
      for (const row of rows) {
        const date = row.date_start;
        const spend = parseFloat(row.spend || '0');
        if (!byDate[date]) byDate[date] = { spendBDT: 0, campaigns: [] };
        byDate[date].spendBDT += spend;
        byDate[date].campaigns.push({ name: row.campaign_name, spendBDT: spend });
      }

      // Upsert one doc per date
      const ops = Object.entries(byDate).map(([date, val]) => ({
        updateOne: {
          filter: { date },
          update: {
            $set: {
              date,
              spendUSD: Math.round((val.spendBDT / exchangeRate) * 100) / 100,
              spendBDT: Math.round(val.spendBDT * 100) / 100,
              exchangeRate,
              source: 'meta_auto',
              campaigns: val.campaigns,
              adAccountId,
              fetchedAt: new Date(),
            },
          },
          upsert: true,
        },
      }));

      if (ops.length > 0) await this.adSpendModel.bulkWrite(ops);

      // Update lastSyncAt
      await this.settingModel.findOneAndUpdate({}, { $set: { 'metaAds.lastSyncAt': new Date() } });

      return { success: true, datesSync: Object.keys(byDate).length };
    } catch (err) {
      this.logger.error('Meta sync error', err?.response?.data || err.message);
      throw new InternalServerErrorException('Failed to sync Meta ad spend');
    }
  }

  // ─── Ad Spend CRUD ────────────────────────────────────────────────────────────

  async getAdSpend(startDate: string, endDate: string): Promise<any> {
    const docs = await this.adSpendModel
      .find({ date: { $gte: startDate, $lte: endDate } })
      .sort({ date: 1 })
      .lean();
    return { success: true, data: docs };
  }

  async addManualSpend(body: { date: string; spendBDT: number; spendUSD?: number; note?: string }): Promise<any> {
    const { date, spendBDT, spendUSD } = body;
    const setting = await this.settingModel.findOne({}).lean();
    const exchangeRate = (setting as any)?.metaAds?.exchangeRate || 130;

    const doc = await this.adSpendModel.findOneAndUpdate(
      { date },
      {
        $set: {
          date,
          spendBDT,
          spendUSD: spendUSD ?? Math.round((spendBDT / exchangeRate) * 100) / 100,
          exchangeRate,
          source: 'manual',
          fetchedAt: new Date(),
        },
      },
      { upsert: true, new: true },
    );

    return { success: true, data: doc };
  }

  async deleteAdSpend(id: string): Promise<any> {
    await this.adSpendModel.findByIdAndDelete(id);
    return { success: true };
  }

  // ─── Expense CRUD ─────────────────────────────────────────────────────────────

  async getExpenses(startDate: string, endDate: string): Promise<any> {
    const docs = await this.expenseModel
      .find({ date: { $gte: startDate, $lte: endDate } })
      .sort({ date: 1 })
      .lean();
    return { success: true, data: docs };
  }

  async addExpense(body: { date: string; amount: number; category?: string; note?: string }): Promise<any> {
    const doc = await this.expenseModel.create(body);
    return { success: true, data: doc };
  }

  async deleteExpense(id: string): Promise<any> {
    await this.expenseModel.findByIdAndDelete(id);
    return { success: true };
  }

  // ─── Settings update ──────────────────────────────────────────────────────────

  async updateSettings(body: { exchangeRate?: number; adAccountId?: string }): Promise<any> {
    const update: any = {};
    if (body.exchangeRate) update['metaAds.exchangeRate'] = body.exchangeRate;
    if (body.adAccountId) update['metaAds.adAccountId'] = body.adAccountId;
    await this.settingModel.findOneAndUpdate({}, { $set: update }, { upsert: true });
    return { success: true };
  }

  async disconnect(): Promise<any> {
    await this.settingModel.findOneAndUpdate(
      {},
      {
        $set: {
          'metaAds.accessToken': null,
          'metaAds.isConnected': false,
          'metaAds.lastSyncAt': null,
        },
      },
    );
    return { success: true };
  }
}
