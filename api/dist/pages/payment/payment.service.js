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
var PaymentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const utils_service_1 = require("../../shared/utils/utils.service");
const sslcommerz_service_1 = require("../../shared/sslcommerz/sslcommerz.service");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const bulk_sms_service_1 = require("../../shared/bulk-sms/bulk-sms.service");
let PaymentService = PaymentService_1 = class PaymentService {
    constructor(orderModel, productModel, utilsService, sslService, configService, http, bulkSmsService) {
        this.orderModel = orderModel;
        this.productModel = productModel;
        this.utilsService = utilsService;
        this.sslService = sslService;
        this.configService = configService;
        this.http = http;
        this.bulkSmsService = bulkSmsService;
        this.logger = new common_1.Logger(PaymentService_1.name);
    }
    async initSSLPayment(body) {
        if (body.tran_id) {
            try {
                const response = await this.sslService.sslInit(body);
                return {
                    success: true,
                    message: 'Success!',
                    data: response,
                };
            }
            catch (error) {
                console.warn(error);
                throw new common_1.InternalServerErrorException(error.message);
            }
        }
        else {
            throw new common_1.InternalServerErrorException();
        }
    }
    async ipn(body) {
        var _a;
        if (body.tran_id) {
            try {
                const order = await this.orderModel.findOne({
                    orderId: body.tran_id,
                });
                const response = await this.sslService.transactionQueryBySessionIdSSL({
                    sessionkey: order.sslSessionId,
                });
                if (response.status === 'VALID') {
                    if (order) {
                        await this.orderModel.findOneAndUpdate({ orderId: body.tran_id }, {
                            paymentStatus: 'paid',
                            paidAmount: Number((_a = response.amount) !== null && _a !== void 0 ? _a : 0),
                        });
                    }
                    for (const f of order['orderedItems']) {
                        await this.productModel.findByIdAndUpdate(f._id, {
                            $inc: {
                                totalSold: f.quantity,
                            },
                        });
                        await this.productModel.findByIdAndUpdate(f._id, {
                            $inc: {
                                quantity: -f.quantity,
                            },
                        });
                    }
                }
                else {
                    await this.orderModel.deleteOne({ orderId: body.tran_id });
                }
                return {
                    success: true,
                    message: 'Success!',
                };
            }
            catch (error) {
                console.warn(error);
                throw new common_1.InternalServerErrorException(error.message);
            }
        }
        else {
            throw new common_1.InternalServerErrorException();
        }
    }
    async getBkashToken() {
        try {
            const url = this.configService.get('bkashUrl');
            const username = this.configService.get('bkashUsername');
            const password = this.configService.get('bkashPassword');
            const appKey = this.configService.get('bkashAppKey');
            const appSecret = this.configService.get('bkashAppSecret');
            const httpReq = async () => {
                return new Promise((resolve, reject) => {
                    this.http
                        .post(`${url}/token/grant`, {
                        app_key: appKey,
                        app_secret: appSecret,
                    }, {
                        headers: {
                            'Content-Type': 'application/json',
                            Accept: 'application/json',
                            username: username,
                            password: password,
                        },
                    })
                        .subscribe({
                        next: (res) => {
                            resolve(res);
                        },
                        error: (err) => {
                            reject(err);
                            console.log(err);
                        },
                    });
                });
            };
            const result = await httpReq();
            return result['data'];
        }
        catch (error) {
            console.warn(error);
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    async executeBkashPayment(paymentID) {
        try {
            const token = await this.getBkashToken();
            const url = this.configService.get('bkashUrl');
            const appKey = this.configService.get('bkashAppKey');
            const httpReq = async () => {
                return new Promise((resolve, reject) => {
                    this.http
                        .post(`${url}/execute`, {
                        paymentID: paymentID,
                    }, {
                        headers: {
                            'Content-Type': 'application/json',
                            Accept: 'application/json',
                            authorization: token.id_token,
                            'x-app-key': appKey,
                        },
                    })
                        .subscribe({
                        next: (res) => {
                            resolve(res);
                        },
                        error: (err) => {
                            reject(err);
                            console.log(err);
                        },
                    });
                });
            };
            const result = await httpReq();
            return result['data'];
        }
        catch (error) {
            console.warn(error);
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    async createBkashPayment(body) {
        try {
            const token = await this.getBkashToken();
            const url = this.configService.get('bkashUrl');
            const appKey = this.configService.get('bkashAppKey');
            const httpReq = async () => {
                return new Promise((resolve, reject) => {
                    this.http
                        .post(`${url}/create`, body, {
                        headers: {
                            'Content-Type': 'application/json',
                            Accept: 'application/json',
                            authorization: token.id_token,
                            'x-app-key': appKey,
                        },
                    })
                        .subscribe({
                        next: (res) => {
                            resolve(res);
                        },
                        error: (err) => {
                            reject(err);
                            console.log(err);
                        },
                    });
                });
            };
            const result = await httpReq();
            return {
                success: true,
                message: 'Success',
                data: result['data'],
            };
        }
        catch (error) {
            console.warn(error);
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    async callbackBkashPayment(body) {
        try {
            const { paymentID, status } = body;
            const orderData = await this.orderModel.findOne({
                bkashPaymentId: paymentID,
            });
            if (status === 'success') {
                const result = await this.executeBkashPayment(paymentID);
                if (result.statusCode === '0000') {
                    await this.orderModel.findByIdAndUpdate(orderData._id, {
                        paymentStatus: 'paid',
                    });
                    const message = `Hi ${orderData.name} \nThanks for Shopping with redgrocer.com. Please wait for confirmation.`;
                    this.bulkSmsService.sentSingleSms(orderData.phoneNo, message);
                    return {
                        success: true,
                        message: 'Success',
                        data: {
                            statusCode: result.statusCode,
                            message: result.statusMessage,
                        },
                    };
                }
                else {
                    await this.orderModel.findByIdAndDelete(orderData._id);
                    return {
                        success: false,
                        message: 'Payment Error',
                        data: {
                            statusCode: result.statusCode,
                            message: result.statusMessage,
                        },
                    };
                }
            }
            else {
                await this.orderModel.findByIdAndDelete(orderData._id);
                return {
                    success: false,
                    message: 'Payment Canceled',
                    data: {
                        statusCode: null,
                        message: 'Payment Canceled',
                    },
                };
            }
        }
        catch (error) {
            console.warn(error);
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
};
PaymentService = PaymentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Order')),
    __param(1, (0, mongoose_1.InjectModel)('Product')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        utils_service_1.UtilsService,
        sslcommerz_service_1.SslcommerzService,
        config_1.ConfigService,
        axios_1.HttpService,
        bulk_sms_service_1.BulkSmsService])
], PaymentService);
exports.PaymentService = PaymentService;
//# sourceMappingURL=payment.service.js.map