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
var BulkSmsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BulkSmsService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
let BulkSmsService = BulkSmsService_1 = class BulkSmsService {
    constructor(httpService, configService) {
        this.httpService = httpService;
        this.configService = configService;
        this.logger = new common_1.Logger(BulkSmsService_1.name);
    }
    sentSingleSms(phoneNo, message) {
        try {
            const token = this.configService.get('greenwebsmsToken');
            const params = new URLSearchParams();
            params.append('token', token);
            params.append('to', phoneNo);
            params.append('message', message);
            this.httpService
                .post('https://api.bdbulksms.net/api.php', params.toString(), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            })
                .subscribe((res) => this.logger.log(`SMS sent to ${phoneNo}:`, res.data), (error) => this.logger.error(`SMS failed to ${phoneNo}:`, (error === null || error === void 0 ? void 0 : error.message) || error));
        }
        catch (error) {
            this.logger.error(`sentSingleSms error for ${phoneNo}:`, (error === null || error === void 0 ? void 0 : error.message) || error);
        }
    }
};
BulkSmsService = BulkSmsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        config_1.ConfigService])
], BulkSmsService);
exports.BulkSmsService = BulkSmsService;
//# sourceMappingURL=bulk-sms.service.js.map