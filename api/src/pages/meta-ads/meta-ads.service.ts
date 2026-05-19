import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class MetaAdsService {
  private readonly logger = new Logger(MetaAdsService.name);

  constructor(
    @InjectModel('MetaAdSpend') private readonly spendModel: Model<any>,
    @InjectModel('MetaToken') private readonly tokenModel: Model<any>,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  getAuthUrl(): string {
    const appId = this.configService.get<string>('META_APP_ID') || process.env.META_APP_ID;
    const redirectUri = this.configService.get<string>('META_REDIRECT_URI') || process.env.META_REDIRECT_URI;
    if (!appId || !redirectUri) return null;
    const scope = 'ads_read';
    return `https://www.facebook.com/v20.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code`;
  }

  async handleCallback(code: string): Promise<any> {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const redirectUri = process.env.META_REDIRECT_URI;

    // Exchange code for short-lived token
    const tokenRes = await firstValueFrom(
      this.httpService.get('https://graph.facebook.com/v20.0/oauth/access_token', {
        params: { client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code },
      }),
    );
    const shortToken = tokenRes.data.access_token;

    // Exchange for long-lived token (60 days)
    const longRes = await firstValueFrom(
      this.httpService.get('https://graph.facebook.com/v20.0/oauth/access_token', {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: appId,
          client_secret: appSecret,
          fb_exchange_token: shortToken,
        },
      }),
    );
    const longToken = longRes.data.access_token;
    const expiresIn = longRes.data.expires_in || 5184000; // 60 days default

    // Get ad accounts for this user
    const meRes = await firstValueFrom(
      this.httpService.get('https://graph.facebook.com/v20.0/me/adaccounts', {
        params: { access_token: longToken, fields: 'id,name' },
      }),
    );
    const adAccountId = meRes.data?.data?.[0]?.id || null;

    await this.tokenModel.findOneAndUpdate(
      {},
      {
        accessToken: longToken,
        adAccountId,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
        lastSync: null,
      },
      { upsert: true, new: true },
    );

    return { connected: true, adAccountId };
  }

  async getStatus(): Promise<any> {
    const token = await this.tokenModel.findOne().lean();
    if (!token?.accessToken) return { connected: false };
    return {
      connected: true,
      adAccountId: token.adAccountId,
      lastSync: token.lastSync,
      expiresAt: token.expiresAt,
    };
  }

  async syncSpend(startDate?: string, endDate?: string): Promise<any> {
    const token = await this.tokenModel.findOne().lean();
    if (!token?.accessToken) throw new InternalServerErrorException('Meta not connected');

    const since = startDate || this.daysAgo(30);
    const until = endDate || this.today();

    const res = await firstValueFrom(
      this.httpService.get(`https://graph.facebook.com/v20.0/${token.adAccountId}/insights`, {
        params: {
          access_token: token.accessToken,
          fields: 'spend,date_start',
          time_increment: 1,
          time_range: JSON.stringify({ since, until }),
          limit: 100,
        },
      }),
    );

    const rows: any[] = res.data?.data || [];
    let synced = 0;
    for (const row of rows) {
      const spend = parseFloat(row.spend) || 0;
      await this.spendModel.findOneAndUpdate(
        { date: row.date_start },
        { date: row.date_start, spend, source: 'api' },
        { upsert: true, new: true },
      );
      synced++;
    }

    await this.tokenModel.findOneAndUpdate({}, { lastSync: new Date() });
    return { synced, since, until };
  }

  async getSpend(startDate: string, endDate: string): Promise<any> {
    const records = await this.spendModel
      .find({ date: { $gte: startDate, $lte: endDate } })
      .sort({ date: 1 })
      .lean();
    const total = records.reduce((s, r) => s + (r.spend || 0), 0);
    return { success: true, data: { daily: records, total } };
  }

  async saveManualSpend(date: string, spend: number): Promise<any> {
    const record = await this.spendModel.findOneAndUpdate(
      { date },
      { date, spend, source: 'manual' },
      { upsert: true, new: true },
    );
    return { success: true, data: record };
  }

  async deleteSpend(id: string): Promise<any> {
    await this.spendModel.findByIdAndDelete(id);
    return { success: true };
  }

  async disconnect(): Promise<any> {
    await this.tokenModel.deleteMany({});
    return { success: true };
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private daysAgo(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  }
}
