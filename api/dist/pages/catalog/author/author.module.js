"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthorModule = void 0;
const common_1 = require("@nestjs/common");
const author_service_1 = require("./author.service");
const author_controller_1 = require("./author.controller");
const mongoose_1 = require("@nestjs/mongoose");
const author_schema_1 = require("../../../schema/author.schema");
const user_schema_1 = require("../../../schema/user.schema");
let AuthorModule = class AuthorModule {
};
AuthorModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: 'Author', schema: author_schema_1.AuthorSchema },
                { name: 'User', schema: user_schema_1.UserSchema },
            ]),
        ],
        providers: [author_service_1.AuthorService],
        controllers: [author_controller_1.AuthorController],
    })
], AuthorModule);
exports.AuthorModule = AuthorModule;
//# sourceMappingURL=author.module.js.map