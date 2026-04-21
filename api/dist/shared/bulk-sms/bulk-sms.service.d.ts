import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
export declare class BulkSmsService {
    private readonly httpService;
    private configService;
    private logger;
    constructor(httpService: HttpService, configService: ConfigService);
    sentSingleSms(phoneNo: string, message: string): void;
}
