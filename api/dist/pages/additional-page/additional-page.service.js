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
var AdditionalPageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdditionalPageService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const ObjectId = mongoose_2.Types.ObjectId;
let AdditionalPageService = AdditionalPageService_1 = class AdditionalPageService {
    constructor(additionalPageModel, cacheManager) {
        this.additionalPageModel = additionalPageModel;
        this.cacheManager = cacheManager;
        this.logger = new common_1.Logger(AdditionalPageService_1.name);
        this.cacheAllData = 'getAllAdditionalPage';
        this.cacheDataCount = 'getCountAdditionalPage';
    }
    async addAdditionalPage(addAdditionalPageDto) {
        try {
            const pageInfo = await this.additionalPageModel.findOne({
                slug: addAdditionalPageDto.slug,
            });
            if (pageInfo) {
                await this.additionalPageModel.findOneAndUpdate({ slug: addAdditionalPageDto.slug }, {
                    $set: addAdditionalPageDto,
                });
                return {
                    success: true,
                    message: 'Data Updated Success',
                    data: null,
                };
            }
            else {
                const newData = new this.additionalPageModel(addAdditionalPageDto);
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
            await this.cacheManager.del(this.cacheAllData);
            await this.cacheManager.del(this.cacheDataCount);
        }
        catch (error) {
            console.log(error);
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    async getAdditionalPageBySlug(slug, select) {
        try {
            const data = await this.additionalPageModel
                .findOne({ slug })
                .select(select);
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
    async updateAdditionalPageBySlug(slug, updateAdditionalPageDto) {
        let data;
        try {
            data = await this.additionalPageModel.findOne({ slug });
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
        if (!data) {
            throw new common_1.NotFoundException('No Data found!');
        }
        try {
            await this.additionalPageModel.findOneAndUpdate({ slug }, {
                $set: updateAdditionalPageDto,
            });
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
    async deleteAdditionalPageBySlug(slug, checkUsage) {
        try {
            await this.additionalPageModel.findOneAndDelete({ slug });
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
};
AdditionalPageService = AdditionalPageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('AdditionalPage')),
    __param(1, (0, common_1.Inject)(common_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [mongoose_2.Model, Object])
], AdditionalPageService);
exports.AdditionalPageService = AdditionalPageService;
//# sourceMappingURL=additional-page.service.js.map