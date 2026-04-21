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
var UserService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("mongoose");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const mongoose_2 = require("@nestjs/mongoose");
const bcrypt = require("bcrypt");
const error_code_enum_1 = require("../../enum/error-code.enum");
const utils_service_1 = require("../../shared/utils/utils.service");
const ObjectId = mongoose_1.Types.ObjectId;
let UserService = UserService_1 = class UserService {
    constructor(userModel, authorModel, addressModel, jwtService, configService, utilsService, cacheManager) {
        this.userModel = userModel;
        this.authorModel = authorModel;
        this.addressModel = addressModel;
        this.jwtService = jwtService;
        this.configService = configService;
        this.utilsService = utilsService;
        this.cacheManager = cacheManager;
        this.logger = new common_1.Logger(UserService_1.name);
        this.cacheAllData = 'getAllUser';
        this.cacheDataCount = 'getCountUser';
    }
    async userSignup(createUserDto) {
        const { password } = createUserDto;
        const salt = await bcrypt.genSalt();
        const hashedPass = await bcrypt.hash(password, salt);
        const mData = Object.assign(Object.assign({}, createUserDto), { password: hashedPass });
        const newUser = new this.userModel(mData);
        try {
            const saveData = await newUser.save();
            await this.cacheManager.del(this.cacheAllData);
            await this.cacheManager.del(this.cacheDataCount);
            return {
                success: true,
                message: 'Success',
                username: saveData.username,
                name: saveData.name,
                _id: saveData._id,
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
    async userLogin(authUserDto) {
        try {
            const user = (await this.userModel
                .findOne({ username: authUserDto.username })
                .select('password username hasAccess'));
            if (!user) {
                return {
                    success: false,
                    message: 'This phone no is not registered!',
                };
            }
            if (!user.hasAccess) {
                return {
                    success: false,
                    message: 'No Access for Login',
                };
            }
            const isMatch = await bcrypt.compare(authUserDto.password, user.password);
            if (isMatch) {
                const payload = {
                    _id: user._id,
                    username: user.username,
                };
                const accessToken = this.jwtService.sign(payload);
                return {
                    success: true,
                    message: 'Login success!',
                    data: {
                        _id: user._id,
                    },
                    token: accessToken,
                    tokenExpiredIn: this.configService.get('userTokenExpiredTime'),
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
            console.log(error);
            if (error.code && error.code.toString() === error_code_enum_1.ErrorCodes.UNIQUE_FIELD) {
                throw new common_1.ConflictException('Username already exists');
            }
            else {
                throw new common_1.InternalServerErrorException();
            }
        }
    }
    async userLoginSocial(authUserDto) {
        try {
            const user = (await this.userModel
                .findOne({ username: authUserDto.username })
                .select('username hasAccess'));
            if (!user) {
                return {
                    success: false,
                    message: 'No user data found!',
                };
            }
            if (!user.hasAccess) {
                return {
                    success: false,
                    message: 'No Access for Login',
                };
            }
            const payload = {
                _id: user._id,
                username: user.username,
            };
            const accessToken = this.jwtService.sign(payload);
            return {
                success: true,
                message: 'Login success!',
                data: {
                    _id: user._id,
                },
                token: accessToken,
                tokenExpiredIn: this.configService.get('userTokenExpiredTime'),
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
    async userSignupAndLogin(createUserDto) {
        try {
            const userData = await this.userModel.findOne({
                username: createUserDto.phoneNo,
            });
            if (userData) {
                return {
                    success: false,
                    message: 'Sorry! Phone no is already registered. Please Login',
                    data: null,
                    token: null,
                    tokenExpiredIn: null,
                };
            }
            else {
                const { password } = createUserDto;
                const salt = await bcrypt.genSalt();
                const hashedPass = await bcrypt.hash(password, salt);
                const mData = Object.assign(Object.assign({}, createUserDto), { password: hashedPass, username: createUserDto.phoneNo });
                const newUser = new this.userModel(mData);
                const saveData = await newUser.save();
                const authUserDto = {
                    username: saveData.username,
                    password: password,
                };
                await this.cacheManager.del(this.cacheAllData);
                await this.cacheManager.del(this.cacheDataCount);
                return this.userLogin(authUserDto);
            }
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
    async userSignupAndLogin1(createUserDto) {
        try {
            let query;
            if (createUserDto.registrationType === 'email') {
                query = { username: createUserDto.email };
            }
            else {
                query = { username: createUserDto.phoneNo };
            }
            const userData = await this.userModel.findOne(query);
            if (userData) {
                return {
                    success: false,
                    message: `Sorry! ${createUserDto.phoneNo ? 'Phone no' : 'Email'} is already registered. Please Login`,
                    data: null,
                    token: null,
                    tokenExpiredIn: null,
                };
            }
            else {
                const { password } = createUserDto;
                const salt = await bcrypt.genSalt();
                const hashedPass = await bcrypt.hash(password, salt);
                const mData = Object.assign(Object.assign({}, createUserDto), {
                    password: hashedPass,
                    username: createUserDto.registrationType === 'email'
                        ? createUserDto.email
                        : createUserDto.phoneNo,
                    phone: createUserDto.registrationType === 'phone'
                        ? createUserDto.phoneNo
                        : null,
                });
                const newUser = new this.userModel(mData);
                await newUser.save();
                const authUserDto = {
                    username: mData.username,
                    password: password,
                };
                return this.userLogin(authUserDto);
            }
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
    async userSignupAndLoginSocial(createUserDto) {
        try {
            const userData = await this.userModel.findOne({
                username: createUserDto.username,
            });
            if (userData) {
                const authUserDto = {
                    username: userData.username,
                };
                return this.userLoginSocial(authUserDto);
            }
            else {
                const newUser = new this.userModel(createUserDto);
                const saveData = await newUser.save();
                const authUserDto = {
                    username: saveData.username,
                };
                await this.cacheManager.del(this.cacheAllData);
                await this.cacheManager.del(this.cacheDataCount);
                return this.userLoginSocial(authUserDto);
            }
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
    async checkUserForRegistration(checkUserRegistrationDto) {
        try {
            const userData = await this.userModel.findOne({
                username: checkUserRegistrationDto.phoneNo,
            });
            if (userData) {
                return {
                    success: true,
                    message: 'Success! Otp has been sent to your phone number.',
                    data: { username: userData.username, otp: true },
                };
            }
            else {
                return {
                    success: false,
                    message: 'User not exists. Please check your phone number',
                    data: { otp: false },
                };
            }
        }
        catch (error) {
            console.log(error);
            if (error.code && error.code.toString() === error_code_enum_1.ErrorCodes.UNIQUE_FIELD) {
                throw new common_1.ConflictException('Phone Number is already exists');
            }
            else {
                throw new common_1.InternalServerErrorException();
            }
        }
    }
    async checkUserForRegistration1(checkUserRegistrationDto) {
        try {
            const userData = await this.userModel.findOne({
                username: checkUserRegistrationDto.username,
            });
            return {
                success: true,
                message: 'Success!',
                data: { hasUser: !!userData },
            };
        }
        catch (error) {
            console.log(error);
            if (error.code && error.code.toString() === error_code_enum_1.ErrorCodes.UNIQUE_FIELD) {
                throw new common_1.ConflictException('Phone Number is already exists');
            }
            else {
                throw new common_1.InternalServerErrorException();
            }
        }
    }
    async getLoggedInUserData(user, selectQuery) {
        try {
            let { select } = selectQuery;
            if (!select) {
                select = '-password';
            }
            const data = await this.userModel.findById(user._id).select(select);
            return {
                data,
                success: true,
            };
        }
        catch (err) {
            this.logger.error(`${user.username} is failed to retrieve data`);
            throw new common_1.InternalServerErrorException();
        }
    }
    async getAllUsers(filterUserDto, searchQuery) {
        const { filter } = filterUserDto;
        const { pagination } = filterUserDto;
        const { sort } = filterUserDto;
        const { select } = filterUserDto;
        if (!pagination && !filter) {
            const cacheData = await this.cacheManager.get(this.cacheAllData);
            const count = await this.cacheManager.get(this.cacheDataCount);
            if (cacheData) {
                this.logger.log('Cached page');
                return {
                    data: cacheData,
                    success: true,
                    message: 'Success',
                    count: count,
                };
            }
        }
        this.logger.log('Not a Cached page');
        if (filter && filter['designation._id']) {
            filter['designation._id'] = new ObjectId(filter['designation._id']);
        }
        if (filter && filter['userType._id']) {
            filter['userType._id'] = new ObjectId(filter['userType._id']);
        }
        const aggregateStages = [];
        let mFilter = {};
        let mSort = {};
        let mSelect = {};
        let mPagination = {};
        if (filter) {
            mFilter = Object.assign(Object.assign({}, mFilter), filter);
        }
        if (searchQuery) {
            mFilter = {
                $and: [
                    mFilter,
                    {
                        $or: [
                            { username: { $regex: searchQuery, $options: 'i' } },
                            { phoneNo: { $regex: searchQuery, $options: 'i' } },
                        ],
                    },
                ],
            };
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
            const dataAggregates = await this.userModel.aggregate(aggregateStages);
            if (pagination) {
                return Object.assign(Object.assign({}, Object.assign({}, dataAggregates[0])), { success: true, message: 'Success' });
            }
            else {
                if (!filter) {
                    await this.cacheManager.set(this.cacheAllData, dataAggregates);
                    await this.cacheManager.set(this.cacheDataCount, dataAggregates.length);
                    this.logger.log('Cache Added');
                }
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
    async getUserById(id, userSelectFieldDto) {
        try {
            let { select } = userSelectFieldDto;
            if (!select) {
                select = '-password';
            }
            const data = await this.userModel.findById(id).select(select);
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
    async updateLoggedInUserInfo(users, updateUserDto) {
        const { password, username } = updateUserDto;
        let user;
        try {
            user = await this.userModel.findById(users._id);
        }
        catch (err) {
            throw new common_1.InternalServerErrorException();
        }
        if (!user) {
            throw new common_1.NotFoundException('No User found!');
        }
        try {
            if (username) {
                const isExists = await this.userModel.findOne({ username });
                if (isExists) {
                    return {
                        success: false,
                        message: 'Username already exists',
                    };
                }
            }
            await this.cacheManager.del(this.cacheAllData);
            await this.cacheManager.del(this.cacheDataCount);
            if (password) {
                const salt = await bcrypt.genSalt();
                const hashedPass = await bcrypt.hash(password, salt);
                await this.userModel.findByIdAndUpdate(users._id, {
                    $set: Object.assign(Object.assign({}, updateUserDto), { password: hashedPass }),
                });
                return {
                    success: true,
                    message: 'Data & Password changed success',
                };
            }
            await this.userModel.findByIdAndUpdate(users._id, {
                $set: updateUserDto,
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
    async changeLoggedInUserPassword(users, changePasswordDto) {
        const { password, oldPassword } = changePasswordDto;
        let user;
        try {
            user = await this.userModel.findById(users._id).select('password');
        }
        catch (err) {
            throw new common_1.InternalServerErrorException();
        }
        if (!user) {
            throw new common_1.NotFoundException('No User found!');
        }
        try {
            const isMatch = await bcrypt.compare(oldPassword, user.password);
            if (isMatch) {
                const salt = await bcrypt.genSalt();
                const hashedPass = await bcrypt.hash(password, salt);
                await this.userModel.findByIdAndUpdate(users._id, {
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
    async checkUserAndSentOtp(checkUserDto) {
        try {
            const { phoneNo, email } = checkUserDto;
            let user;
            if (phoneNo && !email) {
                user = await this.userModel.findOne({ phone: phoneNo });
            }
            if (!phoneNo && email) {
                user = await this.userModel.findOne({ email: email });
            }
            return {
                success: false,
                message: 'User no exists',
            };
        }
        catch (err) {
            console.log(err);
            throw new common_1.InternalServerErrorException();
        }
    }
    async resetUserPassword(resetPasswordDto) {
        const { password, username } = resetPasswordDto;
        let user;
        try {
            user = await this.userModel
                .findOne({ username: username })
                .select('password');
        }
        catch (err) {
            throw new common_1.InternalServerErrorException();
        }
        if (!user) {
            throw new common_1.NotFoundException('No User found!');
        }
        try {
            const salt = await bcrypt.genSalt();
            const hashedPass = await bcrypt.hash(password, salt);
            await this.userModel.findByIdAndUpdate(user._id, {
                $set: { password: hashedPass },
            });
            return {
                success: true,
                message: 'Password reset success',
            };
        }
        catch (err) {
            console.log(err);
            throw new common_1.InternalServerErrorException();
        }
    }
    async updateUserById(id, updateUserDto) {
        const { newPassword, username } = updateUserDto;
        let user;
        try {
            user = await this.userModel.findById(id);
        }
        catch (err) {
            throw new common_1.InternalServerErrorException();
        }
        if (!user) {
            throw new common_1.NotFoundException('No user found!');
        }
        try {
            if (username) {
                if (user.username !== username) {
                    const isExists = await this.userModel.findOne({ username });
                    if (isExists) {
                        return {
                            success: false,
                            message: 'Username already exists',
                        };
                    }
                }
            }
            await this.cacheManager.del(this.cacheAllData);
            await this.cacheManager.del(this.cacheDataCount);
            if (newPassword) {
                const salt = await bcrypt.genSalt();
                const hashedPass = await bcrypt.hash(newPassword, salt);
                await this.userModel.findByIdAndUpdate(id, {
                    $set: Object.assign(Object.assign({}, updateUserDto), { password: hashedPass }),
                });
                return {
                    success: true,
                    message: 'Data & Password changed success',
                };
            }
            delete updateUserDto.password;
            await this.userModel.findByIdAndUpdate(id, {
                $set: updateUserDto,
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
    async deleteUserById(id) {
        let user;
        try {
            user = await this.userModel.findById(id);
        }
        catch (err) {
            throw new common_1.InternalServerErrorException();
        }
        if (!user) {
            throw new common_1.NotFoundException('No User found!');
        }
        try {
            await this.userModel.findByIdAndDelete(id);
            await this.cacheManager.del(this.cacheAllData);
            await this.cacheManager.del(this.cacheDataCount);
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException();
        }
    }
    async deleteMultipleUserById(ids, checkUsage) {
        try {
            const mIds = ids.map((m) => new ObjectId(m));
            await this.userModel.deleteMany({ _id: mIds });
            await this.cacheManager.del(this.cacheAllData);
            await this.cacheManager.del(this.cacheDataCount);
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async followUnfollowAuthor(user, followUnfollowAuthor) {
        try {
            if (followUnfollowAuthor.type === 'follow') {
                await this.authorModel.findByIdAndUpdate(followUnfollowAuthor.author, {
                    $addToSet: { followers: user._id },
                }, { new: true, upsert: true });
                await this.userModel.findByIdAndUpdate(user._id, {
                    $addToSet: { authors: followUnfollowAuthor.author },
                }, { new: true, upsert: true });
            }
            else if (followUnfollowAuthor.type === 'unfollow') {
                await this.authorModel.findByIdAndUpdate(followUnfollowAuthor.author, {
                    $pull: { followers: { $in: new ObjectId(user._id) } },
                });
                await this.userModel.findByIdAndUpdate(user._id, {
                    $pull: {
                        authors: { $in: new ObjectId(followUnfollowAuthor.author) },
                    },
                });
            }
            return {
                success: true,
                message: `${followUnfollowAuthor.type === 'follow'
                    ? 'Author added to your follow list'
                    : 'Author remove from your follow list'}`,
                data: null,
            };
        }
        catch (err) {
            console.log(err);
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async getFollowedAuthorListByUser(user) {
        try {
            const data = await this.userModel.findById(user._id).populate({
                path: 'authors',
                select: 'name slug image',
            });
            const mData = JSON.parse(JSON.stringify(data));
            return {
                success: true,
                message: 'Success',
                data: (mData === null || mData === void 0 ? void 0 : mData.authors) && (mData === null || mData === void 0 ? void 0 : mData.authors.length) ? mData === null || mData === void 0 ? void 0 : mData.authors : [],
            };
        }
        catch (err) {
            console.log(err);
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async checkFollowedAuthorByUser(user, author) {
        try {
            const data = await this.userModel.findOne({
                user: user._id,
                author: { $in: new ObjectId(author) },
            });
            return {
                success: true,
                message: 'Success',
                data: !!data,
            };
        }
        catch (err) {
            console.log(err);
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async addNewAddress(user, addAddressDto) {
        try {
            const final = Object.assign(Object.assign({}, addAddressDto), { user: user._id });
            const newAddress = new this.addressModel(final);
            const address = await newAddress.save();
            await this.userModel.findOneAndUpdate({ _id: user._id }, { $push: { addresses: address._id, division: address.division } });
            return {
                success: true,
                message: 'Address added successfully',
                data: {
                    _id: address._id,
                },
            };
        }
        catch (err) {
            console.log(err);
            throw new common_1.InternalServerErrorException();
        }
    }
    async setDefaultAddressById(user, id) {
        try {
            await this.addressModel.updateOne({ _id: id }, { $set: { setDefaultAddress: true } });
            await this.addressModel.updateMany({
                user: user._id,
                _id: { $nin: new ObjectId(id) },
            }, {
                $set: { setDefaultAddress: false },
            });
            return {
                success: true,
                message: 'Address updated Successfully!',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException();
        }
    }
    async updateAddressById(id, updateAddressDto) {
        try {
            await this.addressModel.updateOne({ _id: id }, { $set: updateAddressDto });
            return {
                success: true,
                message: 'Address updated Successfully!',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException();
        }
    }
    async getAllAddress(user) {
        try {
            const data = await this.userModel
                .findOne({ _id: user._id })
                .select('addresses -_id')
                .populate({
                path: 'addresses',
                model: 'Address',
                options: {
                    sort: { createdAt: -1 },
                },
            });
            return {
                success: true,
                message: 'Address Get Successfully!',
                data: data && data['addresses'] && data['addresses'].length
                    ? data['addresses']
                    : [],
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException();
        }
    }
    async deleteAddressById(id, user) {
        try {
            await this.addressModel.deleteOne({ _id: id });
            await this.userModel.findByIdAndUpdate({ _id: user._id }, { $pull: { addresses: id } });
            return {
                success: true,
                message: 'Address deleted Successfully!',
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException();
        }
    }
};
UserService = UserService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_2.InjectModel)('User')),
    __param(1, (0, mongoose_2.InjectModel)('Author')),
    __param(2, (0, mongoose_2.InjectModel)('Address')),
    __param(6, (0, common_1.Inject)(common_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [mongoose_1.Model,
        mongoose_1.Model,
        mongoose_1.Model,
        jwt_1.JwtService,
        config_1.ConfigService,
        utils_service_1.UtilsService, Object])
], UserService);
exports.UserService = UserService;
//# sourceMappingURL=user.service.js.map