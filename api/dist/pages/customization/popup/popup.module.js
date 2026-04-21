"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PopupModule = void 0;
const common_1 = require("@nestjs/common");
const popup_controller_1 = require("./popup.controller");
const popup_service_1 = require("./popup.service");
const mongoose_1 = require("@nestjs/mongoose");
const popup_schema_1 = require("../../../schema/popup.schema");
const product_schema_1 = require("../../../schema/product.schema");
let PopupModule = class PopupModule {
};
PopupModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: 'Popup', schema: popup_schema_1.PopupSchema },
                { name: 'Product', schema: product_schema_1.ProductSchema },
            ]),
        ],
        controllers: [popup_controller_1.PopupController],
        providers: [popup_service_1.PopupService],
    })
], PopupModule);
exports.PopupModule = PopupModule;
//# sourceMappingURL=popup.module.js.map