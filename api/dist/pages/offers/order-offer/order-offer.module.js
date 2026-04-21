"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderOfferModule = void 0;
const common_1 = require("@nestjs/common");
const order_offer_service_1 = require("./order-offer.service");
const order_offer_controller_1 = require("./order-offer.controller");
const mongoose_1 = require("@nestjs/mongoose");
const order_schema_1 = require("../../../schema/order.schema");
const user_schema_1 = require("../../../schema/user.schema");
const order_offer_schema_1 = require("../../../schema/order-offer.schema");
let OrderOfferModule = class OrderOfferModule {
};
OrderOfferModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: 'OrderOffer', schema: order_offer_schema_1.OrderOfferSchema },
                { name: 'Order', schema: order_schema_1.OrderSchema },
                { name: 'User', schema: user_schema_1.UserSchema },
            ]),
        ],
        providers: [order_offer_service_1.OrderOfferService],
        controllers: [order_offer_controller_1.OrderOfferController],
    })
], OrderOfferModule);
exports.OrderOfferModule = OrderOfferModule;
//# sourceMappingURL=order-offer.module.js.map