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
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const googleapis_1 = require("googleapis");
const nodemailer = require("nodemailer");
const config_1 = require("@nestjs/config");
let EmailService = class EmailService {
    constructor(configService) {
        this.configService = configService;
    }
    async sendEmail(email, subject, htmlBody) {
        try {
            const gmail = this.configService.get('gmail');
            const googleClientId = this.configService.get('googleClientId1');
            const googleClientSecret = this.configService.get('googleClientSecret1');
            const googleClientRedirectUrl = this.configService.get('googleClientRedirectUrl');
            const googleRefreshToken = this.configService.get('googleRefreshToken1');
            const oAuth2Client = new googleapis_1.google.auth.OAuth2(googleClientId, googleClientSecret, googleClientRedirectUrl);
            oAuth2Client.setCredentials({ refresh_token: googleRefreshToken });
            const accessToken = await oAuth2Client.getAccessToken();
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    type: 'OAuth2',
                    user: gmail,
                    clientId: googleClientId,
                    clientSecret: googleClientSecret,
                    refreshToken: googleRefreshToken,
                    accessToken: accessToken,
                },
                tls: {
                    rejectUnauthorized: false
                },
            });
            const emailFrom = gmail;
            const toReceiver = email;
            const info = await transporter.sendMail({
                from: `"Alambook" <${emailFrom}>`,
                replyTo: emailFrom,
                to: toReceiver,
                subject: subject,
                html: htmlBody,
            });
        }
        catch (error) {
            console.log(error);
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
};
EmailService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EmailService);
exports.EmailService = EmailService;
//# sourceMappingURL=email.service.js.map