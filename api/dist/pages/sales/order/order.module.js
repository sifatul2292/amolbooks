"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderModule = void 0;
const common_1 = require("@nestjs/common");
const order_controller_1 = require("./order.controller");
const order_service_1 = require("./order.service");
const mongoose_1 = require("@nestjs/mongoose");
const product_schema_1 = require("../../../schema/product.schema");
const order_schema_1 = require("../../../schema/order.schema");
const unique_id_schema_1 = require("../../../schema/unique-id.schema");
const cart_schema_1 = require("../../../schema/cart.schema");
const user_schema_1 = require("../../../schema/user.schema");
const coupon_schema_1 = require("../../../schema/coupon.schema");
const order_offer_schema_1 = require("../../../schema/order-offer.schema");
const special_package_schema_1 = require("../../../schema/special-package.schema");
const shop_information_schema_1 = require("../../../schema/shop-information.schema");
const setting_schema_1 = require("../../customization/setting/schema/setting.schema");
const admin_schema_1 = require("../../../schema/admin.schema");
let OrderModule = class OrderModule {
};
OrderModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: 'Order', schema: order_schema_1.OrderSchema },
                { name: 'Product', schema: product_schema_1.ProductSchema },
                { name: 'UniqueId', schema: unique_id_schema_1.UniqueIdSchema },
                { name: 'Cart', schema: cart_schema_1.CartSchema },
                { name: 'User', schema: user_schema_1.UserSchema },
                { name: 'Coupon', schema: coupon_schema_1.CouponSchema },
                { name: 'OrderOffer', schema: order_offer_schema_1.OrderOfferSchema },
                { name: 'SpecialPackage', schema: special_package_schema_1.SpecialPackageSchema },
                { name: 'ShopInformation', schema: shop_information_schema_1.ShopInformationSchema },
                { name: 'Setting', schema: setting_schema_1.SettingSchema },
                { name: 'Admin', schema: admin_schema_1.AdminSchema },
            ]),
        ],
        controllers: [order_controller_1.OrderController],
        providers: [order_service_1.OrderService],
    })
], OrderModule);
exports.OrderModule = OrderModule;
//# sourceMappingURL=order.module.js.map