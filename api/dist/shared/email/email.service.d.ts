import { ConfigService } from '@nestjs/config';
export declare class EmailService {
    private configService;
    constructor(configService: ConfigService);
    sendEmail(email: string, subject: string, htmlBody: string): Promise<void>;
}
