import { HttpService } from '@nestjs/axios';
export declare class AnalyticsService {
    private readonly httpService;
    private logger;
    private readonly trackingDisabled;
    constructor(httpService: HttpService);
    trackServerContainerEvent(eventName: string, eventData: Record<string, any>): Promise<any>;
    trackFbConversionEventClient(fbPixelId: string, fbPixelAccessToken: string, data: any): Promise<any>;
}
