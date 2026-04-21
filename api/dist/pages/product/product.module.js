"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductModule = void 0;
const common_1 = require("@nestjs/common");
const product_service_1 = require("./product.service");
const product_controller_1 = require("./product.controller");
const mongoose_1 = require("@nestjs/mongoose");
const product_schema_1 = require("../../schema/product.schema");
const category_schema_1 = require("../../schema/category.schema");
const brand_schema_1 = require("../../schema/brand.schema");
const publisher_schema_1 = require("../../schema/publisher.schema");
const shop_information_schema_1 = require("../../schema/shop-information.schema");
const redirect_url_schema_1 = require("../../schema/redirect-url.schema");
const setting_schema_1 = require("../customization/setting/schema/setting.schema");
let ProductModule = class ProductModule {
};
ProductModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: 'Product', schema: product_schema_1.ProductSchema },
                { name: 'Category', schema: category_schema_1.CategorySchema },
                { name: 'Brand', schema: brand_schema_1.BrandSchema },
                { name: 'Publisher', schema: publisher_schema_1.PublisherSchema },
                { name: 'RedirectUrl', schema: redirect_url_schema_1.RedirectUrlSchema },
                { name: 'ShopInformation', schema: shop_information_schema_1.ShopInformationSchema },
                { name: 'Setting', schema: setting_schema_1.SettingSchema },
            ]),
        ],
        providers: [product_service_1.ProductService],
        controllers: [product_controller_1.ProductController],
        exports: [product_service_1.ProductService],
    })
], ProductModule);
exports.ProductModule = ProductModule;
//# sourceMappingURL=product.module.js.map