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
var SettingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let SettingService = SettingService_1 = class SettingService {
    constructor(settingModel) {
        this.settingModel = settingModel;
        this.logger = new common_1.Logger(SettingService_1.name);
    }
    async addSetting(addSettingDto) {
        try {
            const settingData = await this.settingModel.findOne({});
            if (settingData) {
                await this.settingModel.findByIdAndUpdate(settingData._id, {
                    $set: addSettingDto,
                });
                const data = {
                    _id: settingData._id,
                };
                return {
                    success: true,
                    message: 'Data Updated Success',
                    data,
                };
            }
            else {
                const mData = Object.assign({}, addSettingDto);
                const newData = new this.settingModel(mData);
                const saveData = await newData.save();
                const data = {
                    _id: saveData._id,
                };
                return {
                    success: true,
                    message: 'Data Added Success',
                    data,
                };
            }
        }
        catch (error) {
            console.log(error);
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    async getSetting(select) {
        try {
            const data = await this.settingModel.findOne().select(select);
            return {
                success: true,
                message: 'Success',
                data,
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async getChatLink() {
        var _a;
        try {
            const fSetting = await this.settingModel
                .findOne({})
                .select('chats -_id');
            const fChatLink = (_a = fSetting === null || fSetting === void 0 ? void 0 : fSetting.chats) !== null && _a !== void 0 ? _a : [];
            const chatLink = fChatLink.filter((f) => f.status === 'active');
            return {
                success: true,
                message: 'Success',
                data: chatLink,
            };
        }
        catch (err) {
            console.log(err);
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
};
SettingService = SettingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Setting')),
    __metadata("design:paramtypes", [mongoose_2.Model])
], SettingService);
exports.SettingService = SettingService;
//# sourceMappingURL=setting.service.js.map