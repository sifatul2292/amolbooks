"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewsletterModule = void 0;
const common_1 = require("@nestjs/common");
const newsletter_service_1 = require("./newsletter.service");
const mongoose_1 = require("@nestjs/mongoose");
const newsletter_schema_1 = require("../../../schema/newsletter.schema");
const newsletter_controller_1 = require("./newsletter.controller");
let NewsletterModule = class NewsletterModule {
};
NewsletterModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: 'Newsletter', schema: newsletter_schema_1.NewsletterSchema },
            ]),
        ],
        providers: [newsletter_service_1.NewsletterService],
        controllers: [newsletter_controller_1.NewsletterController],
    })
], NewsletterModule);
exports.NewsletterModule = NewsletterModule;
//# sourceMappingURL=newsletter.module.js.map