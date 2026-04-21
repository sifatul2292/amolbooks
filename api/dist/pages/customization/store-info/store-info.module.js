"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoreInfoModule = void 0;
const common_1 = require("@nestjs/common");
const store_info_service_1 = require("./store-info.service");
const store_info_controller_1 = require("./store-info.controller");
const mongoose_1 = require("@nestjs/mongoose");
const product_schema_1 = require("../../../schema/product.schema");
const store_info_schema_1 = require("../../../schema/store-info.schema");
let StoreInfoModule = class StoreInfoModule {
};
StoreInfoModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: 'StoreInfo', schema: store_info_schema_1.StoreInfoSchema },
                { name: 'Product', schema: product_schema_1.ProductSchema },
            ]),
        ],
        providers: [store_info_service_1.StoreInfoService],
        controllers: [store_info_controller_1.StoreInfoController],
    })
], StoreInfoModule);
exports.StoreInfoModule = StoreInfoModule;
//# sourceMappingURL=store-info.module.js.map