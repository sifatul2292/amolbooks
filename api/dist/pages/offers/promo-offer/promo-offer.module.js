"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromoOfferModule = void 0;
const common_1 = require("@nestjs/common");
const promo_offer_controller_1 = require("./promo-offer.controller");
const promo_offer_service_1 = require("./promo-offer.service");
const mongoose_1 = require("@nestjs/mongoose");
const promo_offer_schema_1 = require("../../../schema/promo-offer.schema");
const product_module_1 = require("../../product/product.module");
let PromoOfferModule = class PromoOfferModule {
};
PromoOfferModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: 'PromoOffer', schema: promo_offer_schema_1.PromoOfferSchema },
                { name: 'Product', schema: product_module_1.ProductModule },
            ]),
        ],
        controllers: [promo_offer_controller_1.PromoOfferController],
        providers: [promo_offer_service_1.PromoOfferService],
    })
], PromoOfferModule);
exports.PromoOfferModule = PromoOfferModule;
//# sourceMappingURL=promo-offer.module.js.map