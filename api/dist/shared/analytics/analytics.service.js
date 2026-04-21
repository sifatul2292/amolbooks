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
var AnalyticsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
let AnalyticsService = AnalyticsService_1 = class AnalyticsService {
    constructor(httpService) {
        this.httpService = httpService;
        this.logger = new common_1.Logger(AnalyticsService_1.name);
    }
    async trackFbConversionEventClient(fbPixelId, fbPixelAccessToken, data) {
        var _a, _b, _c, _d, _e;
        const fbEndpoint = `https://graph.facebook.com/v22.0/${fbPixelId}/events`;
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(fbEndpoint, data, {
                params: { access_token: fbPixelAccessToken },
            }));
            return response.data;
        }
        catch (error) {
            const errorMessage = ((_c = (_b = (_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) === null || _c === void 0 ? void 0 : _c.message) || (error === null || error === void 0 ? void 0 : error.message) || 'Unknown error';
            const errorCode = ((_d = error === null || error === void 0 ? void 0 : error.response) === null || _d === void 0 ? void 0 : _d.status) || (error === null || error === void 0 ? void 0 : error.code) || 'N/A';
            this.logger.warn(`Facebook Conversion API error (${errorCode}): ${errorMessage}`);
            if ((_e = error === null || error === void 0 ? void 0 : error.response) === null || _e === void 0 ? void 0 : _e.data) {
                this.logger.debug('Facebook API error details:', JSON.stringify(error.response.data, null, 2));
            }
            return null;
        }
    }
};
AnalyticsService = AnalyticsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService])
], AnalyticsService);
exports.AnalyticsService = AnalyticsService;
//# sourceMappingURL=analytics.service.js.map