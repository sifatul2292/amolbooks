"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedirectUrlModule = void 0;
const common_1 = require("@nestjs/common");
const redirect_url_service_1 = require("./redirect-url.service");
const redirect_url_controller_1 = require("./redirect-url.controller");
const mongoose_1 = require("@nestjs/mongoose");
const redirect_url_schema_1 = require("../../schema/redirect-url.schema");
const user_schema_1 = require("../../schema/user.schema");
let RedirectUrlModule = class RedirectUrlModule {
};
RedirectUrlModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: 'RedirectUrl', schema: redirect_url_schema_1.RedirectUrlSchema },
                { name: 'User', schema: user_schema_1.UserSchema },
            ]),
        ],
        providers: [redirect_url_service_1.RedirectUrlService],
        controllers: [redirect_url_controller_1.RedirectUrlController],
    })
], RedirectUrlModule);
exports.RedirectUrlModule = RedirectUrlModule;
//# sourceMappingURL=redirect-url.module.js.map