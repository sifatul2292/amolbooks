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
var OtpService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const utils_service_1 = require("../../shared/utils/utils.service");
const bulk_sms_service_1 = require("../../shared/bulk-sms/bulk-sms.service");
const email_service_1 = require("../../shared/email/email.service");
const ObjectId = mongoose_2.Types.ObjectId;
let OtpService = OtpService_1 = class OtpService {
    constructor(otpModel, utilsService, bulkSmsService, emailService) {
        this.otpModel = otpModel;
        this.utilsService = utilsService;
        this.bulkSmsService = bulkSmsService;
        this.emailService = emailService;
        this.logger = new common_1.Logger(OtpService_1.name);
    }
    async generateOtpWithPhoneNo(addOtpDto) {
        try {
            const { phoneNo } = addOtpDto;
            const otpData = await this.otpModel.findOne({ phoneNo });
            if (otpData) {
                const data = {
                    _id: otpData._id,
                };
                const code = this.utilsService.getRandomOtpCode6();
                const expireTime = this.utilsService.addMinuteInCurrentTime(5);
                await this.otpModel.findByIdAndUpdate(otpData._id, {
                    $set: {
                        code,
                        expireTime,
                        createdAt: new Date(),
                    },
                    $inc: {
                        count: 1,
                    },
                });
                this.bulkSmsService.sentSingleSms(phoneNo, `Your otp code is ${code}`);
                console.log('code ', code);
                return {
                    success: true,
                    message: `Success! OTP code has been sent to your phone number.`,
                    data,
                };
            }
            else {
                const code = this.utilsService.getRandomOtpCode6();
                const expireTime = this.utilsService.addMinuteInCurrentTime(5);
                const newData = new this.otpModel({
                    phoneNo,
                    code,
                    expireTime,
                    count: 1,
                });
                const saveData = await newData.save();
                const data = {
                    _id: saveData._id,
                };
                this.bulkSmsService.sentSingleSms(phoneNo, `Your otp code is ${code}`);
                console.log('code ', code);
                return {
                    success: true,
                    message: `Success! OTP code has been sent to your phone number.`,
                    data,
                };
            }
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    async generateOtpWithEmail(addOtpDto) {
        try {
            const { email } = addOtpDto;
            const otpData = await this.otpModel.findOne({ phoneNo: email });
            if (otpData) {
                const data = {
                    _id: otpData._id,
                };
                const code = this.utilsService.getRandomOtpCode6();
                const expireTime = this.utilsService.addMinuteInCurrentTime(5);
                await this.otpModel.findByIdAndUpdate(otpData._id, {
                    $set: {
                        code,
                        expireTime,
                        createdAt: new Date(),
                    },
                    $inc: {
                        count: 1,
                    },
                });
                const html = `
        <p>Your otp code is ${code} </p>
        `;
                this.emailService.sendEmail(email, 'Alambook Otp', html);
                console.log('code ', code);
                return {
                    success: true,
                    message: `Success! OTP code has been sent to your email.`,
                    data,
                };
            }
            else {
                const code = this.utilsService.getRandomOtpCode6();
                const expireTime = this.utilsService.addMinuteInCurrentTime(5);
                const newData = new this.otpModel({
                    phoneNo: email,
                    code,
                    expireTime,
                    count: 1,
                });
                const saveData = await newData.save();
                const data = {
                    _id: saveData._id,
                };
                const html = `
        <p>Your otp code is <strong>${code}</strong> </p>
        `;
                this.emailService.sendEmail(email, 'Alambook Otp', html);
                console.log('code ', code);
                return {
                    success: true,
                    message: `Success! OTP code has been sent to your email.`,
                    data,
                };
            }
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    async validateOtpWithPhoneNo(ValidateOtpDto) {
        try {
            const { phoneNo } = ValidateOtpDto;
            const { code } = ValidateOtpDto;
            const otpData = await this.otpModel.findOne({ phoneNo });
            if (otpData) {
                const isExpired = this.utilsService.getDateDifference(new Date(), new Date(otpData.expireTime), 'seconds');
                if (isExpired <= 0) {
                    return {
                        success: false,
                        message: 'Sorry! Invalid OTP',
                        data: null,
                    };
                }
                else {
                    if (code === otpData.code) {
                        return {
                            success: true,
                            message: 'Success! OTP matched',
                            data: null,
                        };
                    }
                    else {
                        return {
                            success: false,
                            message: 'Sorry! Invalid OTP',
                            data: null,
                        };
                    }
                }
            }
            else {
                return {
                    success: false,
                    message: 'Sorry! Invalid OTP',
                    data: null,
                };
            }
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    async validateOtpWithEmail(ValidateOtpDto) {
        try {
            const { email } = ValidateOtpDto;
            const { code } = ValidateOtpDto;
            const otpData = await this.otpModel.findOne({ phoneNo: email });
            if (otpData) {
                const isExpired = this.utilsService.getDateDifference(new Date(), new Date(otpData.expireTime), 'seconds');
                if (isExpired <= 0) {
                    return {
                        success: false,
                        message: 'Sorry! Invalid OTP',
                        data: null,
                    };
                }
                else {
                    if (code === otpData.code) {
                        return {
                            success: true,
                            message: 'Success! OTP matched',
                            data: null,
                        };
                    }
                    else {
                        return {
                            success: false,
                            message: 'Sorry! Invalid OTP',
                            data: null,
                        };
                    }
                }
            }
            else {
                return {
                    success: false,
                    message: 'Sorry! Invalid OTP',
                    data: null,
                };
            }
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
};
OtpService = OtpService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Otp')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        utils_service_1.UtilsService,
        bulk_sms_service_1.BulkSmsService,
        email_service_1.EmailService])
], OtpService);
exports.OtpService = OtpService;
//# sourceMappingURL=otp.service.js.map