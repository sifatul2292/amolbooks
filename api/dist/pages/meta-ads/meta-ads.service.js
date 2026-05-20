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
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
const https = require("https");
let MetaAdsService = MetaAdsService_1 = class MetaAdsService {
    constructor(spendModel, tokenModel, configService, httpService) {
        this.spendModel = spendModel;
        this.tokenModel = tokenModel;
        this.configService = configService;
        this.httpService = httpService;
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
    async handleCallback(code) {
        var _a, _b, _c;
        const appId = process.env.META_APP_ID;
        const appSecret = process.env.META_APP_SECRET;
        const redirectUri = process.env.META_REDIRECT_URI;
        const tokenRes = await (0, rxjs_1.firstValueFrom)(this.httpService.get('https://graph.facebook.com/v20.0/oauth/access_token', {
            params: { client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code },
        }));
        const shortToken = tokenRes.data.access_token;
        const longRes = await (0, rxjs_1.firstValueFrom)(this.httpService.get('https://graph.facebook.com/v20.0/oauth/access_token', {
            params: {
                grant_type: 'fb_exchange_token',
                client_id: appId,
                client_secret: appSecret,
                fb_exchange_token: shortToken,
            },
        }));
        const longToken = longRes.data.access_token;
        const expiresIn = longRes.data.expires_in || 5184000;
        const meRes = await (0, rxjs_1.firstValueFrom)(this.httpService.get('https://graph.facebook.com/v20.0/me/adaccounts', {
            params: { access_token: longToken, fields: 'id,name' },
        }));
        const adAccountId = ((_c = (_b = (_a = meRes.data) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.id) || null;
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
    async syncSpend(startDate, endDate) {
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
            fields: 'spend,date_start',
            time_increment: '1',
            time_range: JSON.stringify({ since, until }),
            limit: '100',
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
        catch (_a) {
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
        const rows = parsed.data || [];
        let synced = 0;
        for (const row of rows) {
            const spend = parseFloat(row.spend) || 0;
            if (spend > 0) {
                await this.spendModel.findOneAndUpdate({ date: row.date_start }, { date: row.date_start, spend, source: 'api' }, { upsert: true, new: true });
                synced++;
            }
        }
        await this.tokenModel.findOneAndUpdate({}, { lastSync: new Date() });
        return { synced, since, until, adAccountId: token.adAccountId, rawRows: rows.length };
    }
    async getSpend(startDate, endDate) {
        const records = await this.spendModel
            .find({ date: { $gte: startDate, $lte: endDate } })
            .sort({ date: 1 })
            .lean();
        const total = records.reduce((s, r) => s + (r.spend || 0), 0);
        return { success: true, data: { daily: records, total } };
    }
    async saveManualSpend(date, spend) {
        const record = await this.spendModel.findOneAndUpdate({ date }, { date, spend, source: 'manual' }, { upsert: true, new: true });
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
        config_1.ConfigService,
        axios_1.HttpService])
], MetaAdsService);
exports.MetaAdsService = MetaAdsService;
//# sourceMappingURL=meta-ads.service.js.map