"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaAdsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const axios_1 = require("@nestjs/axios");
const meta_ads_controller_1 = require("./meta-ads.controller");
const meta_ads_service_1 = require("./meta-ads.service");
const meta_ad_spend_schema_1 = require("./schema/meta-ad-spend.schema");
let MetaAdsModule = class MetaAdsModule {
};
MetaAdsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            axios_1.HttpModule,
            mongoose_1.MongooseModule.forFeature([
                { name: 'MetaAdSpend', schema: meta_ad_spend_schema_1.MetaAdSpendSchema },
                { name: 'MetaToken', schema: meta_ad_spend_schema_1.MetaTokenSchema },
            ]),
        ],
        controllers: [meta_ads_controller_1.MetaAdsController],
        providers: [meta_ads_service_1.MetaAdsService],
        exports: [meta_ads_service_1.MetaAdsService],
    })
], MetaAdsModule);
exports.MetaAdsModule = MetaAdsModule;
//# sourceMappingURL=meta-ads.module.js.map