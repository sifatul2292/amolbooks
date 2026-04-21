import { OtpService } from './otp.service';
import { AddOtpDto, ValidateOtpDto } from '../../dto/otp.dto';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
export declare class OtpController {
    private otpService;
    private logger;
    constructor(otpService: OtpService);
    generateOtpWithPhoneNo(addOtpDto: AddOtpDto): Promise<ResponsePayload>;
    generateOtpWithEmail(addOtpDto: AddOtpDto): Promise<ResponsePayload>;
    validateOtpWithPhoneNo(validateOtpDto: ValidateOtpDto): Promise<ResponsePayload>;
    validateOtpWithEmail(validateOtpDto: ValidateOtpDto): Promise<ResponsePayload>;
}
