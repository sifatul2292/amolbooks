"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiPromoOfferModule = void 0;
const common_1 = require("@nestjs/common");
const multi_promo_offer_controller_1 = require("./multi-promo-offer.controller");
const multi_promo_offer_service_1 = require("./multi-promo-offer.service");
const mongoose_1 = require("@nestjs/mongoose");
const multi_promo_offer_schema_1 = require("../../../schema/multi-promo-offer.schema");
let MultiPromoOfferModule = class MultiPromoOfferModule {
};
MultiPromoOfferModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: 'MultiPromoOffer', schema: multi_promo_offer_schema_1.MultiPromoOfferSchema },
            ]),
        ],
        controllers: [multi_promo_offer_controller_1.MultiPromoOfferController],
        providers: [multi_promo_offer_service_1.MultiPromoOfferService],
    })
], MultiPromoOfferModule);
exports.MultiPromoOfferModule = MultiPromoOfferModule;
//# sourceMappingURL=multi-Promo-offer.module.js.map