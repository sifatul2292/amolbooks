"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShippingChargeModule = void 0;
const common_1 = require("@nestjs/common");
const shipping_charge_service_1 = require("./shipping-charge.service");
const shipping_charge_controller_1 = require("./shipping-charge.controller");
const mongoose_1 = require("@nestjs/mongoose");
const shipping_charge_schema_1 = require("../../../schema/shipping-charge.schema");
let ShippingChargeModule = class ShippingChargeModule {
};
ShippingChargeModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: 'ShippingCharge', schema: shipping_charge_schema_1.ShippingChargeSchema },
            ]),
        ],
        providers: [shipping_charge_service_1.ShippingChargeService],
        controllers: [shipping_charge_controller_1.ShippingChargeController],
    })
], ShippingChargeModule);
exports.ShippingChargeModule = ShippingChargeModule;
//# sourceMappingURL=shipping-charge.module.js.map