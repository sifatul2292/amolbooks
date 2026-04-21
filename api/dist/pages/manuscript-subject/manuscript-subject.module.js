"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManuscriptSubjectModule = void 0;
const common_1 = require("@nestjs/common");
const manuscript_subject_controller_1 = require("./manuscript-subject.controller");
const manuscript_subject_service_1 = require("./manuscript-subject.service");
const mongoose_1 = require("@nestjs/mongoose");
const manuscript_subject_schema_1 = require("../../schema/manuscript-subject.schema");
const product_schema_1 = require("../../schema/product.schema");
let ManuscriptSubjectModule = class ManuscriptSubjectModule {
};
ManuscriptSubjectModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: 'ManuscriptSubject', schema: manuscript_subject_schema_1.ManuscriptSubjectSchema },
                { name: 'Product', schema: product_schema_1.ProductSchema },
            ]),
        ],
        controllers: [manuscript_subject_controller_1.ManuscriptSubjectController],
        providers: [manuscript_subject_service_1.ManuscriptSubjectService],
    })
], ManuscriptSubjectModule);
exports.ManuscriptSubjectModule = ManuscriptSubjectModule;
//# sourceMappingURL=manuscript-subject.module.js.map