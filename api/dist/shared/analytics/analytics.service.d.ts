import { HttpService } from '@nestjs/axios';
export declare class AnalyticsService {
    private readonly httpService;
    private logger;
    constructor(httpService: HttpService);
    trackFbConversionEventClient(fbPixelId: string, fbPixelAccessToken: string, data: any): Promise<any>;
}
