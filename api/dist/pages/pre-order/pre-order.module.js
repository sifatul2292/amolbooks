"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreOrderModule = void 0;
const common_1 = require("@nestjs/common");
const pre_order_controller_1 = require("./pre-order.controller");
const pre_order_service_1 = require("./pre-order.service");
const mongoose_1 = require("@nestjs/mongoose");
const pre_order_schema_1 = require("../../schema/pre-order.schema");
const product_schema_1 = require("../../schema/product.schema");
const user_schema_1 = require("../../schema/user.schema");
let PreOrderModule = class PreOrderModule {
};
PreOrderModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: 'PreOrder', schema: pre_order_schema_1.PreOrderSchema },
                { name: 'Product', schema: product_schema_1.ProductSchema },
                { name: 'User', schema: user_schema_1.UserSchema },
            ]),
        ],
        controllers: [pre_order_controller_1.PreOrderController],
        providers: [pre_order_service_1.PreOrderService],
        exports: [pre_order_service_1.PreOrderService],
    })
], PreOrderModule);
exports.PreOrderModule = PreOrderModule;
//# sourceMappingURL=pre-order.module.js.map