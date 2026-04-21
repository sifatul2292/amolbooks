"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BannerCaroselModule = void 0;
const common_1 = require("@nestjs/common");
const banner_carosel_service_1 = require("./banner-carosel.service");
const banner_carosel_controller_1 = require("./banner-carosel.controller");
const mongoose_1 = require("@nestjs/mongoose");
const banner_carosel_schema_1 = require("../../../schema/banner-carosel.schema");
const user_schema_1 = require("../../../schema/user.schema");
let BannerCaroselModule = class BannerCaroselModule {
};
BannerCaroselModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: 'BannerCarosel', schema: banner_carosel_schema_1.BannerCaroselSchema },
                { name: 'User', schema: user_schema_1.UserSchema },
            ]),
        ],
        providers: [banner_carosel_service_1.BannerCaroselService],
        controllers: [banner_carosel_controller_1.BannerCaroselController],
    })
], BannerCaroselModule);
exports.BannerCaroselModule = BannerCaroselModule;
//# sourceMappingURL=banner-carosel.module.js.map