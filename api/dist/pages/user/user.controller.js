"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var UserController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const user_service_1 = require("./user.service");
const passport_1 = require("@nestjs/passport");
const get_user_decorator_1 = require("../../decorator/get-user.decorator");
const user_dto_1 = require("../../dto/user.dto");
const mongo_id_validation_pipe_1 = require("../../pipes/mongo-id-validation.pipe");
const admin_jwt_auth_guard_1 = require("../../guards/admin-jwt-auth.guard");
const admin_roles_decorator_1 = require("../../decorator/admin-roles.decorator");
const admin_roles_enum_1 = require("../../enum/admin-roles.enum");
const admin_roles_guard_1 = require("../../guards/admin-roles.guard");
const admin_permissions_decorator_1 = require("../../decorator/admin-permissions.decorator");
const admin_permission_enum_1 = require("../../enum/admin-permission.enum");
const admin_permission_guard_1 = require("../../guards/admin-permission.guard");
const global_variables_1 = require("../../core/global-variables");
const change_password_dto_1 = require("../../dto/change-password.dto");
const user_jwt_auth_guard_1 = require("../../guards/user-jwt-auth.guard");
let UserController = UserController_1 = class UserController {
    constructor(usersService) {
        this.usersService = usersService;
        this.logger = new common_1.Logger(UserController_1.name);
    }
    async userSignup(createUserDto) {
        return await this.usersService.userSignup(createUserDto);
    }
    async userLogin(authUserDto) {
        return await this.usersService.userLogin(authUserDto);
    }
    async userSignupAndLogin(createUserDto) {
        return await this.usersService.userSignupAndLogin(createUserDto);
    }
    async userSignupAndLoginSocial(createUserDto) {
        return await this.usersService.userSignupAndLoginSocial(createUserDto);
    }
    async userSignupAndLogin1(createUserDto) {
        return await this.usersService.userSignupAndLogin1(createUserDto);
    }
    async checkUserForRegistration(checkUserRegistrationDto) {
        return await this.usersService.checkUserForRegistration1(checkUserRegistrationDto);
    }
    async getLoggedInUserData(userSelectFieldDto, user) {
        return this.usersService.getLoggedInUserData(user, userSelectFieldDto);
    }
    async getAllUsersV3(filterUserDto, searchString) {
        return this.usersService.getAllUsers(filterUserDto, searchString);
    }
    async getFollowedAuthorListByUser(user) {
        return await this.usersService.getFollowedAuthorListByUser(user);
    }
    async getAllAddress(user) {
        return await this.usersService.getAllAddress(user);
    }
    async getUserById(id, userSelectFieldDto) {
        return await this.usersService.getUserById(id, userSelectFieldDto);
    }
    async updateLoggedInUserInfo(user, updateUserDto) {
        return await this.usersService.updateLoggedInUserInfo(user, updateUserDto);
    }
    async changeLoggedInUserPassword(user, changePasswordDto) {
        return await this.usersService.changeLoggedInUserPassword(user, changePasswordDto);
    }
    async resetUserPassword(resetPasswordDto) {
        return await this.usersService.resetUserPassword(resetPasswordDto);
    }
    async checkUserAndSentOtp(checkUserDto) {
        return await this.usersService.checkUserAndSentOtp(checkUserDto);
    }
    async followUnfollowAuthor(user, followUnfollowAuthor) {
        return await this.usersService.followUnfollowAuthor(user, followUnfollowAuthor);
    }
    async checkFollowedAuthorByUser(user, data) {
        return await this.usersService.checkFollowedAuthorByUser(user, data.author);
    }
    async updateUserById(id, updateUserDto) {
        return await this.usersService.updateUserById(id, updateUserDto);
    }
    async deleteUserById(id) {
        return await this.usersService.deleteUserById(id);
    }
    async deleteMultipleUserById(data, checkUsage) {
        return await this.usersService.deleteMultipleUserById(data.ids, Boolean(checkUsage));
    }
    async addNewAddress(user, addAddressDto) {
        return await this.usersService.addNewAddress(user, addAddressDto);
    }
    async updateAddressById(id, updateAddressDto) {
        return await this.usersService.updateAddressById(id, updateAddressDto);
    }
    async setDefaultAddressById(id, updateAddressDto, user) {
        console.log('user', user);
        return await this.usersService.setDefaultAddressById(user, id);
    }
    async deleteAddressById(id, user) {
        return await this.usersService.deleteAddressById(id, user);
    }
};
__decorate([
    (0, common_1.Post)('/signup'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_dto_1.CreateUserDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "userSignup", null);
__decorate([
    (0, common_1.Post)('/login'),
    (0, throttler_1.Throttle)(10, 60),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_dto_1.AuthUserDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "userLogin", null);
__decorate([
    (0, common_1.Post)('/signup-and-login'),
    (0, throttler_1.Throttle)(10, 60),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_dto_1.CreateUserDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "userSignupAndLogin", null);
__decorate([
    (0, common_1.Post)('/social-signup-and-login'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_dto_1.CreateSocialUserDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "userSignupAndLoginSocial", null);
__decorate([
    (0, common_1.Post)('/signup-and-login-password'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_dto_1.CreateUserDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "userSignupAndLogin1", null);
__decorate([
    (0, common_1.Post)('/check-user-for-registration'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_dto_1.CheckUserRegistrationDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "checkUserForRegistration", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/logged-in-user-data'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)(global_variables_1.PASSPORT_USER_TOKEN_TYPE)),
    __param(0, (0, common_1.Query)(common_1.ValidationPipe)),
    __param(1, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_dto_1.UserSelectFieldDto, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getLoggedInUserData", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('/get-all'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, admin_roles_decorator_1.AdminMetaRoles)(admin_roles_enum_1.AdminRoles.SUPER_ADMIN, admin_roles_enum_1.AdminRoles.ADMIN, admin_roles_enum_1.AdminRoles.EDITOR, admin_roles_enum_1.AdminRoles.ACCOUNTANT),
    (0, common_1.UseGuards)(admin_roles_guard_1.AdminRolesGuard),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_dto_1.FilterAndPaginationUserDto, String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getAllUsersV3", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/get-followed-author-list'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)(global_variables_1.PASSPORT_USER_TOKEN_TYPE)),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getFollowedAuthorListByUser", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/get-user-address'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)(global_variables_1.PASSPORT_USER_TOKEN_TYPE)),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getAllAddress", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/:id'),
    (0, admin_roles_decorator_1.AdminMetaRoles)(admin_roles_enum_1.AdminRoles.SUPER_ADMIN, admin_roles_enum_1.AdminRoles.ADMIN, admin_roles_enum_1.AdminRoles.EDITOR),
    (0, common_1.UseGuards)(admin_roles_guard_1.AdminRolesGuard),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Query)(common_1.ValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_dto_1.UserSelectFieldDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getUserById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Put)('/update-logged-in-user'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)(global_variables_1.PASSPORT_USER_TOKEN_TYPE)),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, user_dto_1.UpdateUserDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "updateLoggedInUserInfo", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Put)('/change-logged-in-user-password'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)(global_variables_1.PASSPORT_USER_TOKEN_TYPE)),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, change_password_dto_1.ChangePasswordDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "changeLoggedInUserPassword", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Put)('/reset-user-password'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_dto_1.ResetPasswordDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "resetUserPassword", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('/check-user-and-sent-otp'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_dto_1.CheckUserDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "checkUserAndSentOtp", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('/author-follow-unfollow'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)(global_variables_1.PASSPORT_USER_TOKEN_TYPE)),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, user_dto_1.FollowUnfollowAuthor]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "followUnfollowAuthor", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('/check-followed-author'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)(global_variables_1.PASSPORT_USER_TOKEN_TYPE)),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "checkFollowedAuthorByUser", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Put)('/update-data/:id'),
    (0, admin_roles_decorator_1.AdminMetaRoles)(admin_roles_enum_1.AdminRoles.SUPER_ADMIN, admin_roles_enum_1.AdminRoles.ADMIN),
    (0, common_1.UseGuards)(admin_roles_guard_1.AdminRolesGuard),
    (0, admin_permissions_decorator_1.AdminMetaPermissions)(admin_permission_enum_1.AdminPermissions.EDIT),
    (0, common_1.UseGuards)(admin_permission_guard_1.AdminPermissionGuard),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_dto_1.UpdateUserDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "updateUserById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Delete)('/delete-data/:id'),
    (0, admin_roles_decorator_1.AdminMetaRoles)(admin_roles_enum_1.AdminRoles.SUPER_ADMIN, admin_roles_enum_1.AdminRoles.ADMIN),
    (0, common_1.UseGuards)(admin_roles_guard_1.AdminRolesGuard),
    (0, admin_permissions_decorator_1.AdminMetaPermissions)(admin_permission_enum_1.AdminPermissions.DELETE),
    (0, common_1.UseGuards)(admin_permission_guard_1.AdminPermissionGuard),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "deleteUserById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('/delete-multiple-data-by-id'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, admin_roles_decorator_1.AdminMetaRoles)(admin_roles_enum_1.AdminRoles.SUPER_ADMIN),
    (0, common_1.UseGuards)(admin_roles_guard_1.AdminRolesGuard),
    (0, admin_permissions_decorator_1.AdminMetaPermissions)(admin_permission_enum_1.AdminPermissions.DELETE),
    (0, common_1.UseGuards)(admin_permission_guard_1.AdminPermissionGuard),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Query)('checkUsage')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Boolean]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "deleteMultipleUserById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('/add-address'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, common_1.UseGuards)(user_jwt_auth_guard_1.UserJwtAuthGuard),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, user_dto_1.AddAddressDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "addNewAddress", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Put)('/edit-address/:id'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, common_1.UseGuards)(user_jwt_auth_guard_1.UserJwtAuthGuard),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_dto_1.UpdateAddressDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "updateAddressById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Put)('/set-default-address/:id'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, common_1.UseGuards)(user_jwt_auth_guard_1.UserJwtAuthGuard),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_dto_1.UpdateAddressDto, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "setDefaultAddressById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Delete)('/delete-address/:id'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, common_1.UseGuards)(user_jwt_auth_guard_1.UserJwtAuthGuard),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "deleteAddressById", null);
UserController = UserController_1 = __decorate([
    (0, common_1.Controller)('user'),
    __metadata("design:paramtypes", [user_service_1.UserService])
], UserController);
exports.UserController = UserController;
//# sourceMappingURL=user.controller.js.map