import { Model } from 'mongoose';
import { AddOtpDto, ValidateOtpDto } from '../../dto/otp.dto';
import { UtilsService } from '../../shared/utils/utils.service';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { Otp } from '../../interfaces/common/otp.interface';
import { BulkSmsService } from '../../shared/bulk-sms/bulk-sms.service';
import { EmailService } from '../../shared/email/email.service';
export declare class OtpService {
    private readonly otpModel;
    private utilsService;
    private bulkSmsService;
    private emailService;
    private logger;
    constructor(otpModel: Model<Otp>, utilsService: UtilsService, bulkSmsService: BulkSmsService, emailService: EmailService);
    generateOtpWithPhoneNo(addOtpDto: AddOtpDto): Promise<ResponsePayload>;
    generateOtpWithEmail(addOtpDto: AddOtpDto): Promise<ResponsePayload>;
    validateOtpWithPhoneNo(ValidateOtpDto: ValidateOtpDto): Promise<ResponsePayload>;
    validateOtpWithEmail(ValidateOtpDto: ValidateOtpDto): Promise<ResponsePayload>;
}
