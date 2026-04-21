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
var AdminService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const error_code_enum_1 = require("../../enum/error-code.enum");
const bcrypt = require("bcrypt");
const utils_service_1 = require("../../shared/utils/utils.service");
const ObjectId = mongoose_2.Types.ObjectId;
let AdminService = AdminService_1 = class AdminService {
    constructor(adminModel, jwtService, configService, utilsService) {
        this.adminModel = adminModel;
        this.jwtService = jwtService;
        this.configService = configService;
        this.utilsService = utilsService;
        this.logger = new common_1.Logger(AdminService_1.name);
    }
    async adminSignup(createAdminDto) {
        const { password } = createAdminDto;
        const salt = await bcrypt.genSalt();
        const hashedPass = await bcrypt.hash(password, salt);
        const defaultData = {
            password: hashedPass,
            readOnly: false,
            registrationAt: this.utilsService.getDateString(new Date()),
            lastLoggedIn: null,
        };
        const mData = Object.assign(Object.assign({}, createAdminDto), defaultData);
        const newUser = new this.adminModel(mData);
        try {
            const saveData = await newUser.save();
            const data = {
                username: saveData.username,
                name: saveData.name,
                _id: saveData._id,
            };
            return {
                success: true,
                message: 'Registration Success',
                data,
            };
        }
        catch (error) {
            console.log(error);
            if (error.code && error.code.toString() === error_code_enum_1.ErrorCodes.UNIQUE_FIELD) {
                throw new common_1.ConflictException('Username already exists');
            }
            else {
                throw new common_1.InternalServerErrorException();
            }
        }
    }
    async adminLogin(authAdminDto) {
        try {
            const user = (await this.adminModel
                .findOne({ username: authAdminDto.username })
                .select('password username role permissions hasAccess'));
            if (!user) {
                return {
                    success: false,
                    message: 'Username is invalid',
                };
            }
            if (!user.hasAccess) {
                return {
                    success: false,
                    message: 'No Access for Login',
                };
            }
            const isMatch = await bcrypt.compare(authAdminDto.password, user.password);
            if (isMatch) {
                const payload = {
                    _id: user._id,
                    username: user.username,
                    role: user.role,
                    permissions: user.permissions,
                };
                const accessToken = this.jwtService.sign(payload);
                await this.adminModel.findByIdAndUpdate(user._id, {
                    $set: {
                        lastLoggedIn: this.utilsService.getDateWithCurrentTime(new Date()),
                    },
                });
                return {
                    success: true,
                    message: 'Login success!',
                    data: {
                        _id: user._id,
                        role: user.role,
                        permissions: user.permissions,
                    },
                    token: accessToken,
                    tokenExpiredIn: this.configService.get('adminTokenExpiredTime'),
                };
            }
            else {
                return {
                    success: false,
                    message: 'Password not matched!',
                    data: null,
                    token: null,
                    tokenExpiredIn: null,
                };
            }
        }
        catch (error) {
            if (error.code && error.code.toString() === error_code_enum_1.ErrorCodes.UNIQUE_FIELD) {
                throw new common_1.ConflictException('Username already exists');
            }
            else {
                throw new common_1.InternalServerErrorException(error.message);
            }
        }
    }
    async getLoggedInAdminData(admin, selectQuery) {
        try {
            let { select } = selectQuery;
            if (!select) {
                select = '-password';
            }
            const data = await this.adminModel.findById(admin._id).select(select);
            return {
                data,
                success: true,
            };
        }
        catch (err) {
            this.logger.error(`${admin.username} is failed to retrieve data`);
            throw new common_1.InternalServerErrorException();
        }
    }
    async getAllAdmins(filterAdminDto, searchQuery) {
        const { filter } = filterAdminDto;
        const { pagination } = filterAdminDto;
        const { sort } = filterAdminDto;
        const { select } = filterAdminDto;
        const aggregateStages = [];
        let mFilter = {};
        let mSort = {};
        let mSelect = {};
        let mPagination = {};
        if (filter) {
            mFilter = Object.assign(Object.assign({}, mFilter), filter);
        }
        if (searchQuery) {
            mFilter = Object.assign(Object.assign({}, mFilter), { name: new RegExp(searchQuery, 'i') });
        }
        if (sort) {
            mSort = sort;
        }
        else {
            mSort = { createdAt: -1 };
        }
        if (select) {
            delete select.password;
            mSelect = Object.assign(Object.assign({}, mSelect), select);
        }
        else {
            mSelect = { password: 0 };
        }
        if (Object.keys(mFilter).length) {
            aggregateStages.push({ $match: mFilter });
        }
        if (Object.keys(mSort).length) {
            aggregateStages.push({ $sort: mSort });
        }
        if (!pagination) {
            aggregateStages.push({ $project: mSelect });
        }
        if (pagination) {
            delete mSelect['password'];
            if (Object.keys(mSelect).length) {
                mPagination = {
                    $facet: {
                        metadata: [{ $count: 'total' }],
                        data: [
                            {
                                $skip: pagination.pageSize * pagination.currentPage,
                            },
                            { $limit: pagination.pageSize },
                            { $project: mSelect },
                        ],
                    },
                };
            }
            else {
                mPagination = {
                    $facet: {
                        metadata: [{ $count: 'total' }],
                        data: [
                            {
                                $skip: pagination.pageSize * pagination.currentPage,
                            },
                            { $limit: pagination.pageSize },
                            { $project: { password: 0 } },
                        ],
                    },
                };
            }
            aggregateStages.push(mPagination);
            aggregateStages.push({
                $project: {
                    data: 1,
                    count: { $arrayElemAt: ['$metadata.total', 0] },
                },
            });
        }
        try {
            const dataAggregates = await this.adminModel.aggregate(aggregateStages);
            if (pagination) {
                return Object.assign(Object.assign({}, Object.assign({}, dataAggregates[0])), { success: true, message: 'Success' });
            }
            else {
                return {
                    data: dataAggregates,
                    success: true,
                    message: 'Success',
                    count: dataAggregates.length,
                };
            }
        }
        catch (err) {
            this.logger.error(err);
            if (err.code && err.code.toString() === error_code_enum_1.ErrorCodes.PROJECTION_MISMATCH) {
                throw new common_1.BadRequestException('Error! Projection mismatch');
            }
            else {
                throw new common_1.InternalServerErrorException();
            }
        }
    }
    async getAdminsBySearch(searchQuery, selectQuery) {
        const newQuery = searchQuery.split(/[ ,]+/);
        const queryArray = newQuery.map((str) => ({ name: RegExp(str, 'i') }));
        const queryArray2 = newQuery.map((str) => ({ email: RegExp(str, 'i') }));
        const queryArray3 = newQuery.map((str) => ({ phoneNo: RegExp(str, 'i') }));
        const queryArray4 = newQuery.map((str) => ({ username: RegExp(str, 'i') }));
        try {
            return await this.adminModel
                .find({
                $or: [
                    { $and: queryArray },
                    { $and: queryArray2 },
                    { $and: queryArray3 },
                    { $and: queryArray4 },
                ],
            })
                .limit(20)
                .select(selectQuery ? selectQuery.select : '-password');
        }
        catch (err) {
            throw new common_1.InternalServerErrorException();
        }
    }
    async getAdminById(id, adminSelectFieldDto) {
        try {
            let { select } = adminSelectFieldDto;
            if (!select) {
                select = '-password';
            }
            const data = await this.adminModel.findById(id).select(select);
            return {
                success: true,
                message: 'Success',
                data,
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException();
        }
    }
    async updateLoggedInAdminInfo(admin, updateAdminDto) {
        const { password, username } = updateAdminDto;
        let user;
        try {
            user = await this.adminModel.findById(admin._id);
        }
        catch (err) {
            throw new common_1.InternalServerErrorException();
        }
        if (!user) {
            throw new common_1.NotFoundException('No Admin found!');
        }
        try {
            if (updateAdminDto.role) {
                delete updateAdminDto.role;
            }
            if (updateAdminDto.permissions) {
                delete updateAdminDto.permissions;
            }
            if (username) {
                const isExists = await this.adminModel.findOne({ username });
                if (isExists) {
                    return {
                        success: false,
                        message: 'Username already exists',
                    };
                }
            }
            if (password) {
                const salt = await bcrypt.genSalt();
                const hashedPass = await bcrypt.hash(password, salt);
                await this.adminModel.findByIdAndUpdate(admin._id, {
                    $set: Object.assign(Object.assign({}, updateAdminDto), { password: hashedPass }),
                });
                return {
                    success: true,
                    message: 'Data & Password changed success',
                };
            }
            await this.adminModel.findByIdAndUpdate(admin._id, {
                $set: updateAdminDto,
            });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException();
        }
    }
    async changeLoggedInAdminPassword(admind, changePasswordDto) {
        const { password, oldPassword } = changePasswordDto;
        let admin;
        try {
            admin = await this.adminModel.findById(admind._id).select('password');
        }
        catch (err) {
            throw new common_1.InternalServerErrorException();
        }
        if (!admin) {
            throw new common_1.NotFoundException('No Admin found!');
        }
        try {
            const isMatch = await bcrypt.compare(oldPassword, admin.password);
            if (isMatch) {
                const salt = await bcrypt.genSalt();
                const hashedPass = await bcrypt.hash(password, salt);
                await this.adminModel.findByIdAndUpdate(admin._id, {
                    $set: { password: hashedPass },
                });
                return {
                    success: true,
                    message: 'Password changed success',
                };
            }
            else {
                return {
                    success: false,
                    message: 'Old password is incorrect!',
                };
            }
        }
        catch (err) {
            console.log(err);
            throw new common_1.InternalServerErrorException();
        }
    }
    async updateAdminById(id, updateAdminDto) {
        const { newPassword, username } = updateAdminDto;
        let user;
        try {
            user = await this.adminModel.findById(id);
        }
        catch (err) {
            throw new common_1.InternalServerErrorException();
        }
        if (!user) {
            throw new common_1.NotFoundException('No Admin found!');
        }
        try {
            if (updateAdminDto.password) {
                delete updateAdminDto.password;
            }
            if (username) {
                if (user.username !== username) {
                    const isExists = await this.adminModel.findOne({ username });
                    if (isExists) {
                        return {
                            success: false,
                            message: 'Username already exists',
                        };
                    }
                }
            }
            if (newPassword) {
                const salt = await bcrypt.genSalt();
                const hashedPass = await bcrypt.hash(newPassword, salt);
                await this.adminModel.findByIdAndUpdate(id, {
                    $set: Object.assign(Object.assign({}, updateAdminDto), { password: hashedPass }),
                });
                return {
                    success: true,
                    message: 'Data & Password changed success',
                };
            }
            await this.adminModel.findByIdAndUpdate(id, {
                $set: updateAdminDto,
            });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException();
        }
    }
    async updateMultipleAdminById(ids, updateAdminDto) {
        const mIds = ids.map((m) => new ObjectId(m));
        if (updateAdminDto.password) {
            delete updateAdminDto.password;
        }
        if (updateAdminDto.username) {
            delete updateAdminDto.username;
        }
        if (updateAdminDto.ids) {
            delete updateAdminDto.ids;
        }
        try {
            await this.adminModel.updateMany({ _id: { $in: mIds } }, { $set: updateAdminDto });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async deleteAdminById(id) {
        let user;
        try {
            user = await this.adminModel.findById(id);
        }
        catch (err) {
            throw new common_1.InternalServerErrorException();
        }
        if (!user) {
            throw new common_1.NotFoundException('No Admin found!');
        }
        try {
            await this.adminModel.findByIdAndDelete(id);
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException();
        }
    }
    async deleteMultipleAdminById(ids) {
        try {
            await this.adminModel.deleteMany({ _id: ids });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
};
AdminService = AdminService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Admin')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        jwt_1.JwtService,
        config_1.ConfigService,
        utils_service_1.UtilsService])
], AdminService);
exports.AdminService = AdminService;
//# sourceMappingURL=admin.service.js.map