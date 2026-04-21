"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WishListModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const product_schema_1 = require("../../schema/product.schema");
const wish_list_controller_1 = require("./wish-list.controller");
const wish_list_service_1 = require("./wish-list.service");
const user_schema_1 = require("../../schema/user.schema");
const wish_list_schema_1 = require("../../schema/wish-list.schema");
let WishListModule = class WishListModule {
};
WishListModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: 'User', schema: user_schema_1.UserSchema },
                { name: 'WishList', schema: wish_list_schema_1.WishListSchema },
                { name: 'Product', schema: product_schema_1.ProductSchema },
            ]),
        ],
        controllers: [wish_list_controller_1.WishListController],
        providers: [wish_list_service_1.WishListService],
    })
], WishListModule);
exports.WishListModule = WishListModule;
//# sourceMappingURL=wish-list.module.js.map