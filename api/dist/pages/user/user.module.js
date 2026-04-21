"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModule = void 0;
const common_1 = require("@nestjs/common");
const user_controller_1 = require("./user.controller");
const user_service_1 = require("./user.service");
const config_1 = require("@nestjs/config");
const passport_1 = require("@nestjs/passport");
const mongoose_1 = require("@nestjs/mongoose");
const jwt_1 = require("@nestjs/jwt");
const user_schema_1 = require("../../schema/user.schema");
const jwt_user_strategy_1 = require("./jwt-user.strategy");
const global_variables_1 = require("../../core/global-variables");
const promo_offer_schema_1 = require("../../schema/promo-offer.schema");
const author_schema_1 = require("../../schema/author.schema");
const address_schema_1 = require("../../schema/address.schema");
let UserModule = class UserModule {
};
UserModule = __decorate([
    (0, common_1.Module)({
        imports: [
            passport_1.PassportModule.register({
                defaultStrategy: global_variables_1.PASSPORT_USER_TOKEN_TYPE,
                property: 'user',
                session: false,
            }),
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: async (configService) => ({
                    secret: configService.get('userJwtSecret'),
                    signOptions: {
                        expiresIn: configService.get('userTokenExpiredTime'),
                    },
                }),
            }),
            mongoose_1.MongooseModule.forFeature([
                { name: 'User', schema: user_schema_1.UserSchema },
                { name: 'PromoOffer', schema: promo_offer_schema_1.PromoOfferSchema },
                { name: 'Author', schema: author_schema_1.AuthorSchema },
                { name: 'Address', schema: address_schema_1.AddressSchema },
            ]),
        ],
        controllers: [user_controller_1.UserController],
        providers: [user_service_1.UserService, jwt_user_strategy_1.JwtUserStrategy],
        exports: [passport_1.PassportModule],
    })
], UserModule);
exports.UserModule = UserModule;
//# sourceMappingURL=user.module.js.map