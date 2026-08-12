import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';

@Injectable()
export class MetaAdsService {
  private readonly logger = new Logger(MetaAdsService.name);

  constructor(
    @InjectModel('MetaAdSpend') private readonly spendModel: Model<any>,
    @InjectModel('MetaToken') private readonly tokenModel: Model<any>,
    private readonly configService: ConfigService,
  ) {}

  getAuthUrl(): string {
    const appId = this.configService.get<string>('META_APP_ID') || process.env.META_APP_ID;
    const redirectUri = this.configService.get<string>('META_REDIRECT_URI') || process.env.META_REDIRECT_URI;
    if (!appId || !redirectUri) return null;
    const scope = 'ads_read';
    return `https://www.facebook.com/v20.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code`;
  }

  // Fetches a Graph API URL and parses its JSON, raising Facebook's own error
  // message (or a clear transport failure) instead of letting an interrupted
  // gzip response crash as an opaque zlib "unexpected end of file".
  private async graphGetJson(url: string): Promise<any> {
    const { body } = await this.httpsGet(url);
    let parsed: any;
    try {
      parsed = JSON.parse(body);
    } catch {
      throw new Error(`Meta returned an unparseable response: ${body.slice(0, 200)}`);
    }
    if (parsed?.error) {
      throw new Error(parsed.error.message || 'Meta Graph API returned an error.');
    }
    return parsed;
  }

  async handleCallback(code: string): Promise<any> {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const redirectUri = process.env.META_REDIRECT_URI;

    // Exchange code for short-lived token
    const tokenQs = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      code,
    });
    const tokenData = await this.graphGetJson(
      `https://graph.facebook.com/v20.0/oauth/access_token?${tokenQs.toString()}`,
    );
    const shortToken = tokenData.access_token;

    // Exchange for long-lived token (60 days)
    const longQs = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: shortToken,
    });
    const longData = await this.graphGetJson(
      `https://graph.facebook.com/v20.0/oauth/access_token?${longQs.toString()}`,
    );
    const longToken = longData.access_token;
    const expiresIn = longData.expires_in || 5184000; // 60 days default

    // Get ad accounts for this user
    const meQs = new URLSearchParams({ access_token: longToken, fields: 'id,name' });
    const meData = await this.graphGetJson(
      `https://graph.facebook.com/v20.0/me/adaccounts?${meQs.toString()}`,
    );
    const adAccountId = meData?.data?.[0]?.id || null;

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

  private httpsGet(url: string): Promise<{ status: number; body: string }> {
    return new Promise((resolve, reject) => {
      const req = https.get(url, { headers: { 'Accept-Encoding': 'identity' } }, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf-8') });
        });
        res.on('error', reject);
      });
      req.on('error', reject);
      req.setTimeout(30000, () => { req.destroy(new Error('Request timeout (30s)')); });
    });
  }

  /**
   * Reads the Purchase entry out of an insights `actions`/`action_values` array.
   * Meta labels the pixel/CAPI purchase `offsite_conversion.fb_pixel_purchase`
   * and also reports a rolled-up `purchase`; prefer the pixel row and fall back
   * to the aggregate so a container change cannot silently zero this out.
   */
  private pickPurchaseAction(actions: any): number {
    if (!Array.isArray(actions)) return 0;
    const byType = (type: string) =>
      actions.find((action: any) => action?.action_type === type);
    const match =
      byType('offsite_conversion.fb_pixel_purchase') || byType('purchase');
    const value = parseFloat(match?.value);
    return Number.isFinite(value) ? value : 0;
  }

  async syncSpend(startDate?: string, endDate?: string): Promise<any> {
    const token = await this.tokenModel.findOne().lean();
    if (!token?.accessToken) throw new InternalServerErrorException('Meta not connected');
    if (!token.adAccountId) {
      return { synced: 0, error: 'No ad account found. Re-connect Meta to re-fetch ad accounts.', adAccountId: null };
    }

    const since = startDate || this.daysAgo(30);
    const until = endDate || this.daysAgo(1);

    const qs = new URLSearchParams({
      access_token: token.accessToken,
      fields:
        'spend,date_start,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,actions,action_values',
      level: 'ad',
      time_increment: '1',
      time_range: JSON.stringify({ since, until }),
      // Report conversions on the day the purchase happened, not the day of the
      // click. Without this, today's sales get credited to whichever earlier day
      // the ad was clicked, and the count never lines up with our order records.
      action_report_time: 'conversion',
      action_attribution_windows: JSON.stringify(['7d_click', '1d_view']),
      limit: '500',
    });
    const fullUrl = `https://graph.facebook.com/v20.0/${token.adAccountId}/insights?${qs.toString()}`;

    let rawBody: string;
    let httpStatus: number;
    try {
      const result = await this.httpsGet(fullUrl);
      httpStatus = result.status;
      rawBody = result.body;
    } catch (err) {
      const msg = err?.message || 'Network error';
      return { synced: 0, error: 'Request failed: ' + msg, adAccountId: token.adAccountId, since, until };
    }

    this.logger.log(`Meta insights HTTP ${httpStatus}, body[0..300]: ${rawBody.slice(0, 300)}`);

    let parsed: any;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return {
        synced: 0,
        error: `Meta returned non-JSON (HTTP ${httpStatus}). Body: ${rawBody.slice(0, 150)}`,
        adAccountId: token.adAccountId,
        since,
        until,
      };
    }

    if (parsed?.error) {
      const e = parsed.error;
      let hint = '';
      if (e.code === 190) hint = ' — Token expired. Reconnect Meta.';
      else if (e.code === 100 || e.code === 10) hint = ' — Token missing ads_read permission. Reconnect Meta.';
      else if (e.code === 200 || e.code === 273) hint = ' — No permission for this ad account. Reconnect Meta.';
      return { synced: 0, error: e.message + hint, errorCode: e.code, adAccountId: token.adAccountId, since, until };
    }

    if (!parsed || !Array.isArray(parsed.data)) {
      return { synced: 0, error: 'Unexpected Meta response shape. Reconnect Meta and try again.', adAccountId: token.adAccountId, since, until };
    }

    const rows: any[] = [...(parsed.data || [])];
    let nextUrl = parsed.paging?.next;
    let pages = 1;
    while (nextUrl && pages < 50) {
      try {
        const nextResult = await this.httpsGet(nextUrl);
        const nextPage = JSON.parse(nextResult.body);
        if (nextPage?.error || !Array.isArray(nextPage?.data)) {
          this.logger.warn('Meta pagination stopped on page ' + (pages + 1) + '.');
          break;
        }
        rows.push(...nextPage.data);
        nextUrl = nextPage.paging?.next;
        pages++;
      } catch (error) {
        this.logger.warn('Meta pagination failed on page ' + (pages + 1) + ': ' + (error?.message || error));
        break;
      }
    }
    if (nextUrl) this.logger.warn('Meta insights pagination reached the 50-page safety limit.');
    const byDate = new Map<string, any[]>();
    rows.forEach((row) => {
      const spend = parseFloat(row.spend) || 0;
      if (!row.date_start || spend <= 0) return;
      if (!byDate.has(row.date_start)) byDate.set(row.date_start, []);
      byDate.get(row.date_start).push({
        campaignId: row.campaign_id || '',
        campaignName: row.campaign_name || 'Unlabelled campaign',
        adSetId: row.adset_id || '',
        adSetName: row.adset_name || '',
        adId: row.ad_id || '',
        adName: row.ad_name || '',
        spend,
        purchases: this.pickPurchaseAction(row.actions),
        purchaseValue: this.pickPurchaseAction(row.action_values),
      });
    });

    let synced = 0;
    for (const [date, breakdown] of byDate.entries()) {
      const spend = breakdown.reduce((sum, row) => sum + row.spend, 0);
      const purchases = breakdown.reduce(
        (sum, row) => sum + (row.purchases || 0),
        0,
      );
      const purchaseValue = breakdown.reduce(
        (sum, row) => sum + (row.purchaseValue || 0),
        0,
      );
      await this.spendModel.findOneAndUpdate(
        { date },
        {
          date,
          spend,
          purchases,
          purchaseValue,
          source: 'api',
          currency: 'BDT',
          breakdown,
        },
        { upsert: true, new: true },
      );
      synced++;
    }

    await this.tokenModel.findOneAndUpdate({}, { lastSync: new Date() });
    return { synced, since, until, adAccountId: token.adAccountId, rawRows: rows.length, pages };
  }

  async getSpend(startDate: string, endDate: string): Promise<any> {
    const records = await this.spendModel
      .find({ date: { $gte: startDate, $lte: endDate } })
      .sort({ date: 1 })
      .lean();
    const total = records.reduce((s, r) => s + (r.spend || 0), 0);
    const totalPurchases = records.reduce(
      (s, r: any) => s + (r.purchases || 0),
      0,
    );
    const totalPurchaseValue = records.reduce(
      (s, r: any) => s + (r.purchaseValue || 0),
      0,
    );
    const campaignMap = new Map<string, any>();
    records.forEach((record: any) => {
      (record.breakdown || []).forEach((row: any) => {
        const key = row.campaignId || row.campaignName || 'unknown';
        if (!campaignMap.has(key)) {
          campaignMap.set(key, {
            campaignId: row.campaignId || '',
            campaignName: row.campaignName || 'Unlabelled campaign',
            spend: 0,
            purchases: 0,
            purchaseValue: 0,
          });
        }
        const campaign = campaignMap.get(key);
        campaign.spend += row.spend || 0;
        campaign.purchases += row.purchases || 0;
        campaign.purchaseValue += row.purchaseValue || 0;
      });
    });
    const campaigns = Array.from(campaignMap.values()).sort((a, b) => b.spend - a.spend);
    return {
      success: true,
      data: {
        daily: records,
        total,
        totalPurchases,
        totalPurchaseValue,
        campaigns,
      },
    };
  }

  async saveManualSpend(date: string, spend: number): Promise<any> {
    const record = await this.spendModel.findOneAndUpdate(
      { date },
      { date, spend, source: 'manual', currency: 'BDT', breakdown: [] },
      { upsert: true, new: true },
    );
    return { success: true, data: record };
  }

  async deleteSpend(id: string): Promise<any> {
    await this.spendModel.findByIdAndDelete(id);
    return { success: true };
  }

  async setAdAccountId(adAccountId: string): Promise<any> {
    const id = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
    await this.tokenModel.findOneAndUpdate({}, { adAccountId: id }, { upsert: true });
    return { success: true, adAccountId: id };
  }

  async diagnose(): Promise<any> {
    const diag: any = { timestamp: new Date().toISOString() };

    const token = await this.tokenModel.findOne().lean();
    diag.tokenExists = !!token;
    diag.hasAccessToken = !!token?.accessToken;
    diag.tokenLength = token?.accessToken?.length || 0;
    diag.adAccountId = token?.adAccountId || null;
    diag.expiresAt = token?.expiresAt || null;
    diag.tokenExpired = token?.expiresAt ? new Date(token.expiresAt) < new Date() : 'unknown';

    if (!token?.accessToken || !token?.adAccountId) {
      diag.metaApiTest = 'skipped — no token or adAccountId';
      return diag;
    }

    const qs = new URLSearchParams({
      access_token: token.accessToken,
      fields: 'spend,date_start',
      time_increment: '1',
      time_range: JSON.stringify({ since: this.daysAgo(3), until: this.daysAgo(1) }),
      limit: '5',
    });
    const url = `https://graph.facebook.com/v20.0/${token.adAccountId}/insights?${qs.toString()}`;

    try {
      const result = await this.httpsGet(url);
      diag.metaHttpStatus = result.status;
      diag.metaBodyPreview = result.body.slice(0, 500);
      try {
        const j = JSON.parse(result.body);
        diag.metaParsedOk = true;
        diag.metaHasError = !!j.error;
        if (j.error) {
          diag.metaErrorCode = j.error.code;
          diag.metaErrorMessage = j.error.message;
        }
        diag.metaDataRows = j.data?.length ?? 'no data array';
      } catch {
        diag.metaParsedOk = false;
      }
    } catch (err) {
      diag.metaApiTest = 'FAILED: ' + (err?.message || String(err));
    }

    return diag;
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
