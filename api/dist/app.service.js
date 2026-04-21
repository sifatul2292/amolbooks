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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppService = void 0;
const common_1 = require("@nestjs/common");
const job_scheduler_service_1 = require("./shared/job-scheduler/job-scheduler.service");
const db_tools_service_1 = require("./shared/db-tools/db-tools.service");
let AppService = class AppService {
    constructor(jobSchedulerService, dbToolsService) {
        this.jobSchedulerService = jobSchedulerService;
        this.dbToolsService = dbToolsService;
        this.jobSchedulerService.reAddScheduler();
        this.jobSchedulerService.autoBackupDatabaseToDrive();
    }
    async backupDatabase(password) {
        try {
            if (password === 'ikbalsazib11') {
                await this.dbToolsService.backupMongoDb();
                return {
                    success: true,
                    message: 'Data Backup Success',
                };
            }
            else {
                return {
                    success: false,
                    message: 'Sorry! Not allowed',
                };
            }
        }
        catch (error) {
            console.log(error);
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    async restoreDatabase(password) {
        try {
            if (password === 'ikbalsazib11') {
                await this.dbToolsService.restoreMongoDb();
                return {
                    success: true,
                    message: 'Data Restore Success',
                };
            }
            else {
                return {
                    success: false,
                    message: 'Sorry! Not allowed',
                };
            }
        }
        catch (error) {
            console.log(error);
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
};
AppService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [job_scheduler_service_1.JobSchedulerService,
        db_tools_service_1.DbToolsService])
], AppService);
exports.AppService = AppService;
//# sourceMappingURL=app.service.js.map