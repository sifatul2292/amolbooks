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
var JobSchedulerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobSchedulerService = void 0;
const common_1 = require("@nestjs/common");
const schedule = require("node-schedule");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const config_1 = require("@nestjs/config");
const utils_service_1 = require("../utils/utils.service");
const db_tools_service_1 = require("../db-tools/db-tools.service");
let JobSchedulerService = JobSchedulerService_1 = class JobSchedulerService {
    constructor(jobSchedulerModel, promoOfferModel, configService, utilsService, dbToolsService) {
        this.jobSchedulerModel = jobSchedulerModel;
        this.promoOfferModel = promoOfferModel;
        this.configService = configService;
        this.utilsService = utilsService;
        this.dbToolsService = dbToolsService;
        this.logger = new common_1.Logger(JobSchedulerService_1.name);
    }
    async autoBackupDatabaseToDrive() {
        schedule.scheduleJob('30 3 * * *', async () => {
            console.log('Database Backing up...');
            await this.dbToolsService.backupMongoDb();
        });
    }
    async addOfferScheduleOnStart(isNew, id, expTime, products, jobId) {
        const jobName = this.configService.get('promoOfferScheduleOnStart');
        let saveJob;
        if (isNew) {
            const data = {
                name: jobName,
                collectionName: 'PromoOffer',
                id: id,
            };
            const jobScheduler = new this.jobSchedulerModel(data);
            saveJob = await jobScheduler.save();
        }
        schedule.scheduleJob(jobName, expTime, async () => {
            this.logger.log('DOING at -> ' + jobName + '---' + expTime.toString());
            await this.utilsService.updateProductsOnOfferStart(products);
            await this.jobSchedulerModel.deleteOne({
                _id: isNew ? saveJob._id : jobId,
            });
        });
    }
    async addOfferScheduleOnEnd(isNew, id, expTime, products, jobId) {
        const jobName = this.configService.get('promoOfferScheduleOnEnd');
        let saveJob;
        if (isNew) {
            const data = {
                name: jobName,
                collectionName: 'PromoOffer',
                id: id,
            };
            const jobScheduler = new this.jobSchedulerModel(data);
            saveJob = await jobScheduler.save();
        }
        schedule.scheduleJob(jobName, expTime, async () => {
            this.logger.log('DOING at -> ' + jobName + '---' + expTime.toString());
            await this.utilsService.updateProductsOnOfferEnd(products);
            await this.jobSchedulerModel.deleteOne({
                _id: isNew ? saveJob._id : jobId,
            });
            await this.promoOfferModel.findByIdAndDelete(id);
        });
    }
    async cancelOfferJobScheduler(name) {
        schedule.cancelJob(name);
        await this.jobSchedulerModel.deleteOne({
            collectionName: 'PromoOffer',
            name: name,
        });
    }
    async reAddScheduler() {
        const jobScheduler = await this.jobSchedulerModel.find();
        const mJobScheduler = JSON.parse(JSON.stringify(jobScheduler));
        if (mJobScheduler && mJobScheduler.length) {
            for (const f of mJobScheduler) {
                const offer = await this.promoOfferModel.findById(f.id);
                if (offer) {
                    const isStartDate = this.utilsService.getDateDifference(new Date(), new Date(offer.startDateTime), 'seconds');
                    const isEndDate = this.utilsService.getDateDifference(new Date(), new Date(offer.endDateTime), 'seconds');
                    const jobNameStart = this.configService.get('promoOfferScheduleOnStart');
                    const jobNameEnd = this.configService.get('promoOfferScheduleOnEnd');
                    if (f.name === jobNameStart) {
                        if (isStartDate <= 0) {
                            await this.utilsService.updateProductsOnOfferStart(offer.products);
                            await this.jobSchedulerModel.findByIdAndDelete(f._id);
                        }
                        else {
                            await this.addOfferScheduleOnStart(false, f.id, offer.startDateTime, offer.products, f._id);
                        }
                    }
                    if (f.name === jobNameEnd) {
                        if (isEndDate <= 0) {
                            await this.utilsService.updateProductsOnOfferEnd(offer.products);
                            await this.promoOfferModel.findByIdAndDelete(f.id);
                            await this.jobSchedulerModel.findByIdAndDelete(f._id);
                        }
                        else {
                            await this.addOfferScheduleOnEnd(false, f.id, offer.endDateTime, offer.products, f._id);
                        }
                    }
                }
            }
        }
    }
};
JobSchedulerService = JobSchedulerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('JobScheduler')),
    __param(1, (0, mongoose_1.InjectModel)('PromoOffer')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        config_1.ConfigService,
        utils_service_1.UtilsService,
        db_tools_service_1.DbToolsService])
], JobSchedulerService);
exports.JobSchedulerService = JobSchedulerService;
//# sourceMappingURL=job-scheduler.service.js.map