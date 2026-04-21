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
            console.log('test9999999999999', phoneNo);
            const smsSenderSecret = this.configService.get('smsSenderSecret');
            const password = this.configService.get('smsSenderPassword');
            const smsSenderId = this.configService.get('smsSenderId');
            const encodedApiKey = encodeURIComponent(smsSenderSecret || '');
            const encodedPhoneNo = encodeURIComponent(phoneNo || '');
            const encodedSenderId = encodeURIComponent(smsSenderId || '');
            const encodedMessage = encodeURIComponent(message || '');
            const url = `http://bulksmsbd.net/api/smsapi?api_key=${encodedApiKey}&type=text&number=${encodedPhoneNo}&senderid=${encodedSenderId}&message=${encodedMessage}`;
            this.httpService.post(url, {}).subscribe((res) => {
                this.logger.log('SMS sent successfully:', res.data);
            }, (error) => {
                this.logger.error(`Failed to send SMS to ${phoneNo}:`, (error === null || error === void 0 ? void 0 : error.message) || error);
            });
        }
        catch (error) {
            this.logger.error(`Error in sentSingleSms for ${phoneNo}:`, (error === null || error === void 0 ? void 0 : error.message) || error);
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