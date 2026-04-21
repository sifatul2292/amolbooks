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
var FbCatalogService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FbCatalogService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const rxjs_1 = require("rxjs");
let FbCatalogService = FbCatalogService_1 = class FbCatalogService {
    constructor(httpService, configService) {
        this.httpService = httpService;
        this.configService = configService;
        this.logger = new common_1.Logger(FbCatalogService_1.name);
    }
    async addFbCatalogProduct(data) {
        var _a;
        const cdnUrlBase = this.configService.get('cdnUrlBase');
        const apiUrl = `${cdnUrlBase}/api/upload/csv-upload`;
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(apiUrl, data));
            return response.data;
        }
        catch (error) {
            this.logger.error('Failed to add product to Facebook Catalog', (_a = error.response) === null || _a === void 0 ? void 0 : _a.data);
            throw error;
        }
    }
    async updateFbCatalogProduct(productId, data) {
        var _a;
        const fbCatalogAccessToken = this.configService.get('fbCatalogAccessToken');
        const fbCatalogId = this.configService.get('fbCatalogId');
        const fbApiUrl = `https://graph.facebook.com/v22.0/${fbCatalogId}/products/${productId}`;
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(fbApiUrl, data, {
                params: { access_token: fbCatalogAccessToken },
            }));
            return response.data;
        }
        catch (error) {
            this.logger.error('Failed to update product in Facebook Catalog', (_a = error.response) === null || _a === void 0 ? void 0 : _a.data);
            throw error;
        }
    }
};
FbCatalogService = FbCatalogService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        config_1.ConfigService])
], FbCatalogService);
exports.FbCatalogService = FbCatalogService;
//# sourceMappingURL=fb-catalog.service.js.map