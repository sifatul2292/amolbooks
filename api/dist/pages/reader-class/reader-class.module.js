"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReaderClassModule = void 0;
const common_1 = require("@nestjs/common");
const reader_class_controller_1 = require("./reader-class.controller");
const reader_class_service_1 = require("./reader-class.service");
const mongoose_1 = require("@nestjs/mongoose");
const reader_class_schema_1 = require("../../schema/reader-class.schema");
const product_schema_1 = require("../../schema/product.schema");
let ReaderClassModule = class ReaderClassModule {
};
ReaderClassModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: 'ReaderClass', schema: reader_class_schema_1.ReaderClassSchema },
                { name: 'Product', schema: product_schema_1.ProductSchema },
            ]),
        ],
        controllers: [reader_class_controller_1.ReaderClassController],
        providers: [reader_class_service_1.ReaderClassService],
    })
], ReaderClassModule);
exports.ReaderClassModule = ReaderClassModule;
//# sourceMappingURL=reader-class.module.js.map