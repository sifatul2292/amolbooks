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
var SslcommerzService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SslcommerzService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const sslcommerz_1 = require("sslcommerz");
let SslcommerzService = SslcommerzService_1 = class SslcommerzService {
    constructor(httpService, configService) {
        this.httpService = httpService;
        this.configService = configService;
        this.logger = new common_1.Logger(SslcommerzService_1.name);
    }
    sslInit(data) {
        const store_id = this.configService.get('STORE_ID');
        const store_passwd = this.configService.get('STORE_PASSWORD');
        data.store_id = store_id;
        data.store_passwd = store_passwd;
        try {
            return new Promise((resolve, reject) => {
                const credential = new sslcommerz_1.SslCommerzPayment(store_id, store_passwd, true);
                const response = credential.init(data);
                response.then(async (res) => {
                    resolve(res);
                }, (error) => {
                    reject(error);
                });
            });
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    validateSSL(data) {
        const store_id = this.configService.get('STORE_ID');
        const store_passwd = this.configService.get('STORE_PASSWORD');
        data.store_id = store_id;
        data.store_passwd = store_passwd;
        try {
            const credential = new sslcommerz_1.SslCommerzPayment(process.env.STORE_ID, process.env.STORE_PASSWORD, true);
            const response = credential.validate(data);
            response.then((result) => {
                return {
                    success: true,
                    message: 'Success',
                    data: result,
                };
            });
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    transactionQueryBySessionIdSSL(data) {
        const store_id = this.configService.get('STORE_ID');
        const store_passwd = this.configService.get('STORE_PASSWORD');
        try {
            return new Promise((resolve, reject) => {
                const credential = new sslcommerz_1.SslCommerzPayment(store_id, store_passwd, true);
                const response = credential.transactionQueryBySessionId(data);
                response.then(async (res) => {
                    console.log(res);
                    resolve(res);
                }, (error) => {
                    reject(error);
                });
            });
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    transactionQueryByTransactionIdSSL(data) {
        const store_id = this.configService.get('STORE_ID');
        const store_passwd = this.configService.get('STORE_PASSWORD');
        try {
            const credential = new sslcommerz_1.SslCommerzPayment(process.env.STORE_ID, process.env.STORE_PASSWORD, true);
            const response = credential.transactionQueryByTransactionId(data);
            response.then((result) => {
                return {
                    success: true,
                    message: 'Success',
                    data: result,
                };
            });
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
};
SslcommerzService = SslcommerzService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        config_1.ConfigService])
], SslcommerzService);
exports.SslcommerzService = SslcommerzService;
//# sourceMappingURL=sslcommerz.service.js.map