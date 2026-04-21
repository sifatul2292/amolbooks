"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdditionalPageModule = void 0;
const common_1 = require("@nestjs/common");
const additional_page_service_1 = require("./additional-page.service");
const additional_page_controller_1 = require("./additional-page.controller");
const mongoose_1 = require("@nestjs/mongoose");
const additional_page_schema_1 = require("../../schema/additional-page.schema");
let AdditionalPageModule = class AdditionalPageModule {
};
AdditionalPageModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: 'AdditionalPage', schema: additional_page_schema_1.AdditionalPageSchema },
            ]),
        ],
        providers: [additional_page_service_1.AdditionalPageService],
        controllers: [additional_page_controller_1.AdditionalPageController],
    })
], AdditionalPageModule);
exports.AdditionalPageModule = AdditionalPageModule;
//# sourceMappingURL=additional-page.module.js.map