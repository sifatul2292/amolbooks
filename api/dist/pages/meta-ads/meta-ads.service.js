"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var MetaAdsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaAdsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const config_1 = require("@nestjs/config");
const https = require("https");
let MetaAdsService = MetaAdsService_1 = class MetaAdsService {
    constructor(spendModel, tokenModel, configService) {
        this.spendModel = spendModel;
        this.tokenModel = tokenModel;
        this.configService = configService;
        this.logger = new common_1.Logger(MetaAdsService_1.name);
    }
    getAuthUrl() {
        const appId = this.configService.get('META_APP_ID') || process.env.META_APP_ID;
        const redirectUri = this.configService.get('META_REDIRECT_URI') || process.env.META_REDIRECT_URI;
        if (!appId || !redirectUri)
            return null;
        const scope = 'ads_read';
        return `https://www.facebook.com/v20.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code`;
    }
    async graphGetJson(url) {
        const { body } = await this.httpsGet(url);
        let parsed;
        try {
            parsed = JSON.parse(body);
        }
        catch (_a) {
            throw new Error(`Meta returned an unparseable response: ${body.slice(0, 200)}`);
        }
        if (parsed === null || parsed === void 0 ? void 0 : parsed.error) {
            throw new Error(parsed.error.message || 'Meta Graph API returned an error.');
        }
        return parsed;
    }
    async handleCallback(code) {
        var _a, _b;
        const appId = process.env.META_APP_ID;
        const appSecret = process.env.META_APP_SECRET;
        const redirectUri = process.env.META_REDIRECT_URI;
        const tokenQs = new URLSearchParams({
            client_id: appId,
            client_secret: appSecret,
            redirect_uri: redirectUri,
            code,
        });
        const tokenData = await this.graphGetJson(`https://graph.facebook.com/v20.0/oauth/access_token?${tokenQs.toString()}`);
        const shortToken = tokenData.access_token;
        const longQs = new URLSearchParams({
            grant_type: 'fb_exchange_token',
            client_id: appId,
            client_secret: appSecret,
            fb_exchange_token: shortToken,
        });
        const longData = await this.graphGetJson(`https://graph.facebook.com/v20.0/oauth/access_token?${longQs.toString()}`);
        const longToken = longData.access_token;
        const expiresIn = longData.expires_in || 5184000;
        const meQs = new URLSearchParams({ access_token: longToken, fields: 'id,name' });
        const meData = await this.graphGetJson(`https://graph.facebook.com/v20.0/me/adaccounts?${meQs.toString()}`);
        const adAccountId = ((_b = (_a = meData === null || meData === void 0 ? void 0 : meData.data) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.id) || null;
        await this.tokenModel.findOneAndUpdate({}, {
            accessToken: longToken,
            adAccountId,
            expiresAt: new Date(Date.now() + expiresIn * 1000),
            lastSync: null,
        }, { upsert: true, new: true });
        return { connected: true, adAccountId };
    }
    async getStatus() {
        const token = await this.tokenModel.findOne().lean();
        if (!(token === null || token === void 0 ? void 0 : token.accessToken))
            return { connected: false };
        return {
            connected: true,
            adAccountId: token.adAccountId,
            lastSync: token.lastSync,
            expiresAt: token.expiresAt,
        };
    }
    httpsGet(url) {
        return new Promise((resolve, reject) => {
            const req = https.get(url, { headers: { 'Accept-Encoding': 'identity' } }, (res) => {
                const chunks = [];
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
    pickPurchaseAction(actions) {
        if (!Array.isArray(actions))
            return 0;
        const byType = (type) => actions.find((action) => (action === null || action === void 0 ? void 0 : action.action_type) === type);
        const match = byType('offsite_conversion.fb_pixel_purchase') || byType('purchase');
        const value = parseFloat(match === null || match === void 0 ? void 0 : match.value);
        return Number.isFinite(value) ? value : 0;
    }
    async syncSpend(startDate, endDate) {
        var _a, _b;
        const token = await this.tokenModel.findOne().lean();
        if (!(token === null || token === void 0 ? void 0 : token.accessToken))
            throw new common_1.InternalServerErrorException('Meta not connected');
        if (!token.adAccountId) {
            return { synced: 0, error: 'No ad account found. Re-connect Meta to re-fetch ad accounts.', adAccountId: null };
        }
        const since = startDate || this.daysAgo(30);
        const until = endDate || this.daysAgo(1);
        const qs = new URLSearchParams({
            access_token: token.accessToken,
            fields: 'spend,date_start,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,actions,action_values',
            level: 'ad',
            time_increment: '1',
            time_range: JSON.stringify({ since, until }),
            action_report_time: 'conversion',
            action_attribution_windows: JSON.stringify(['7d_click', '1d_view']),
            limit: '500',
        });
        const fullUrl = `https://graph.facebook.com/v20.0/${token.adAccountId}/insights?${qs.toString()}`;
        let rawBody;
        let httpStatus;
        try {
            const result = await this.httpsGet(fullUrl);
            httpStatus = result.status;
            rawBody = result.body;
        }
        catch (err) {
            const msg = (err === null || err === void 0 ? void 0 : err.message) || 'Network error';
            return { synced: 0, error: 'Request failed: ' + msg, adAccountId: token.adAccountId, since, until };
        }
        this.logger.log(`Meta insights HTTP ${httpStatus}, body[0..300]: ${rawBody.slice(0, 300)}`);
        let parsed;
        try {
            parsed = JSON.parse(rawBody);
        }
        catch (_c) {
            return {
                synced: 0,
                error: `Meta returned non-JSON (HTTP ${httpStatus}). Body: ${rawBody.slice(0, 150)}`,
                adAccountId: token.adAccountId,
                since,
                until,
            };
        }
        if (parsed === null || parsed === void 0 ? void 0 : parsed.error) {
            const e = parsed.error;
            let hint = '';
            if (e.code === 190)
                hint = ' — Token expired. Reconnect Meta.';
            else if (e.code === 100 || e.code === 10)
                hint = ' — Token missing ads_read permission. Reconnect Meta.';
            else if (e.code === 200 || e.code === 273)
                hint = ' — No permission for this ad account. Reconnect Meta.';
            return { synced: 0, error: e.message + hint, errorCode: e.code, adAccountId: token.adAccountId, since, until };
        }
        if (!parsed || !Array.isArray(parsed.data)) {
            return { synced: 0, error: 'Unexpected Meta response shape. Reconnect Meta and try again.', adAccountId: token.adAccountId, since, until };
        }
        const rows = [...(parsed.data || [])];
        let nextUrl = (_a = parsed.paging) === null || _a === void 0 ? void 0 : _a.next;
        let pages = 1;
        while (nextUrl && pages < 50) {
            try {
                const nextResult = await this.httpsGet(nextUrl);
                const nextPage = JSON.parse(nextResult.body);
                if ((nextPage === null || nextPage === void 0 ? void 0 : nextPage.error) || !Array.isArray(nextPage === null || nextPage === void 0 ? void 0 : nextPage.data)) {
                    this.logger.warn('Meta pagination stopped on page ' + (pages + 1) + '.');
                    break;
                }
                rows.push(...nextPage.data);
                nextUrl = (_b = nextPage.paging) === null || _b === void 0 ? void 0 : _b.next;
                pages++;
            }
            catch (error) {
                this.logger.warn('Meta pagination failed on page ' + (pages + 1) + ': ' + ((error === null || error === void 0 ? void 0 : error.message) || error));
                break;
            }
        }
        if (nextUrl)
            this.logger.warn('Meta insights pagination reached the 50-page safety limit.');
        const byDate = new Map();
        rows.forEach((row) => {
            const spend = parseFloat(row.spend) || 0;
            if (!row.date_start || spend <= 0)
                return;
            if (!byDate.has(row.date_start))
                byDate.set(row.date_start, []);
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
        this.datesBetween(since, until).forEach((date) => {
            if (!byDate.has(date))
                byDate.set(date, []);
        });
        let synced = 0;
        for (const [date, breakdown] of byDate.entries()) {
            const spend = breakdown.reduce((sum, row) => sum + row.spend, 0);
            const purchases = breakdown.reduce((sum, row) => sum + (row.purchases || 0), 0);
            const purchaseValue = breakdown.reduce((sum, row) => sum + (row.purchaseValue || 0), 0);
            await this.spendModel.findOneAndUpdate({ date }, {
                date,
                spend,
                purchases,
                purchaseValue,
                source: 'api',
                currency: 'BDT',
                breakdown,
            }, { upsert: true, new: true });
            synced++;
        }
        await this.tokenModel.findOneAndUpdate({}, { lastSync: new Date() });
        return { synced, since, until, adAccountId: token.adAccountId, rawRows: rows.length, pages };
    }
    async getSpend(startDate, endDate) {
        const records = await this.spendModel
            .find({ date: { $gte: startDate, $lte: endDate } })
            .sort({ date: 1 })
            .lean();
        const total = records.reduce((s, r) => s + (r.spend || 0), 0);
        const totalPurchases = records.reduce((s, r) => s + (r.purchases || 0), 0);
        const totalPurchaseValue = records.reduce((s, r) => s + (r.purchaseValue || 0), 0);
        const campaignMap = new Map();
        records.forEach((record) => {
            (record.breakdown || []).forEach((row) => {
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
    async saveManualSpend(date, spend) {
        const record = await this.spendModel.findOneAndUpdate({ date }, { date, spend, source: 'manual', currency: 'BDT', breakdown: [] }, { upsert: true, new: true });
        return { success: true, data: record };
    }
    async deleteSpend(id) {
        await this.spendModel.findByIdAndDelete(id);
        return { success: true };
    }
    async setAdAccountId(adAccountId) {
        const id = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
        await this.tokenModel.findOneAndUpdate({}, { adAccountId: id }, { upsert: true });
        return { success: true, adAccountId: id };
    }
    async diagnose() {
        var _a, _b, _c;
        const diag = { timestamp: new Date().toISOString() };
        const token = await this.tokenModel.findOne().lean();
        diag.tokenExists = !!token;
        diag.hasAccessToken = !!(token === null || token === void 0 ? void 0 : token.accessToken);
        diag.tokenLength = ((_a = token === null || token === void 0 ? void 0 : token.accessToken) === null || _a === void 0 ? void 0 : _a.length) || 0;
        diag.adAccountId = (token === null || token === void 0 ? void 0 : token.adAccountId) || null;
        diag.expiresAt = (token === null || token === void 0 ? void 0 : token.expiresAt) || null;
        diag.tokenExpired = (token === null || token === void 0 ? void 0 : token.expiresAt) ? new Date(token.expiresAt) < new Date() : 'unknown';
        if (!(token === null || token === void 0 ? void 0 : token.accessToken) || !(token === null || token === void 0 ? void 0 : token.adAccountId)) {
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
                diag.metaDataRows = (_c = (_b = j.data) === null || _b === void 0 ? void 0 : _b.length) !== null && _c !== void 0 ? _c : 'no data array';
            }
            catch (_d) {
                diag.metaParsedOk = false;
            }
        }
        catch (err) {
            diag.metaApiTest = 'FAILED: ' + ((err === null || err === void 0 ? void 0 : err.message) || String(err));
        }
        return diag;
    }
    async disconnect() {
        await this.tokenModel.deleteMany({});
        return { success: true };
    }
    today() {
        return new Date().toISOString().slice(0, 10);
    }
    datesBetween(since, until) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(since) || !/^\d{4}-\d{2}-\d{2}$/.test(until)) {
            return [];
        }
        const start = new Date(`${since}T00:00:00.000Z`);
        const end = new Date(`${until}T00:00:00.000Z`);
        if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end < start) {
            return [];
        }
        const dates = [];
        for (let cursor = start; cursor <= end && dates.length <= 366; cursor = new Date(cursor.getTime() + 86400000)) {
            dates.push(cursor.toISOString().slice(0, 10));
        }
        return dates;
    }
    daysAgo(n) {
        const d = new Date();
        d.setDate(d.getDate() - n);
        return d.toISOString().slice(0, 10);
    }
};
MetaAdsService = MetaAdsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('MetaAdSpend')),
    __param(1, (0, mongoose_1.InjectModel)('MetaToken')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        config_1.ConfigService])
], MetaAdsService);
exports.MetaAdsService = MetaAdsService;
//# sourceMappingURL=meta-ads.service.js.map