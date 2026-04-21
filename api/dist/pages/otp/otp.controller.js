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
var OtpController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpController = void 0;
const common_1 = require("@nestjs/common");
const otp_service_1 = require("./otp.service");
const otp_dto_1 = require("../../dto/otp.dto");
let OtpController = OtpController_1 = class OtpController {
    constructor(otpService) {
        this.otpService = otpService;
        this.logger = new common_1.Logger(OtpController_1.name);
    }
    async generateOtpWithPhoneNo(addOtpDto) {
        return await this.otpService.generateOtpWithPhoneNo(addOtpDto);
    }
    async generateOtpWithEmail(addOtpDto) {
        return await this.otpService.generateOtpWithEmail(addOtpDto);
    }
    async validateOtpWithPhoneNo(validateOtpDto) {
        return await this.otpService.validateOtpWithPhoneNo(validateOtpDto);
    }
    async validateOtpWithEmail(validateOtpDto) {
        return await this.otpService.validateOtpWithEmail(validateOtpDto);
    }
};
__decorate([
    (0, common_1.Post)('/generate-otp'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [otp_dto_1.AddOtpDto]),
    __metadata("design:returntype", Promise)
], OtpController.prototype, "generateOtpWithPhoneNo", null);
__decorate([
    (0, common_1.Post)('/generate-otp-with-email'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [otp_dto_1.AddOtpDto]),
    __metadata("design:returntype", Promise)
], OtpController.prototype, "generateOtpWithEmail", null);
__decorate([
    (0, common_1.Post)('/validate-otp'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [otp_dto_1.ValidateOtpDto]),
    __metadata("design:returntype", Promise)
], OtpController.prototype, "validateOtpWithPhoneNo", null);
__decorate([
    (0, common_1.Post)('/validate-otp-with-email'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [otp_dto_1.ValidateOtpDto]),
    __metadata("design:returntype", Promise)
], OtpController.prototype, "validateOtpWithEmail", null);
OtpController = OtpController_1 = __decorate([
    (0, common_1.Controller)('otp'),
    __metadata("design:paramtypes", [otp_service_1.OtpService])
], OtpController);
exports.OtpController = OtpController;
//# sourceMappingURL=otp.controller.js.map