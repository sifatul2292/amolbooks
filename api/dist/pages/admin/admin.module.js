"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModule = void 0;
const common_1 = require("@nestjs/common");
const admin_controller_1 = require("./admin.controller");
const admin_service_1 = require("./admin.service");
const config_1 = require("@nestjs/config");
const passport_1 = require("@nestjs/passport");
const jwt_1 = require("@nestjs/jwt");
const mongoose_1 = require("@nestjs/mongoose");
const admin_schema_1 = require("../../schema/admin.schema");
const jwt_admin_strategy_1 = require("./jwt-admin.strategy");
const global_variables_1 = require("../../core/global-variables");
let AdminModule = class AdminModule {
};
AdminModule = __decorate([
    (0, common_1.Module)({
        imports: [
            passport_1.PassportModule.register({
                defaultStrategy: global_variables_1.PASSPORT_ADMIN_TOKEN_TYPE,
                property: 'admin',
                session: false,
            }),
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: async (configService) => ({
                    secret: configService.get('adminJwtSecret'),
                    signOptions: {
                        expiresIn: configService.get('adminTokenExpiredTime'),
                    },
                }),
            }),
            mongoose_1.MongooseModule.forFeature([{ name: 'Admin', schema: admin_schema_1.AdminSchema }]),
        ],
        controllers: [admin_controller_1.AdminController],
        providers: [admin_service_1.AdminService, jwt_admin_strategy_1.JwtAdminStrategy],
        exports: [passport_1.PassportModule],
    })
], AdminModule);
exports.AdminModule = AdminModule;
//# sourceMappingURL=admin.module.js.map