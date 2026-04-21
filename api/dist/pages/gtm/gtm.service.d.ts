import { Request } from 'express';
import { AddGtmThemePageViewDto, AddGtmThemeViewContentDto } from './dto/gtm.dto';
import { UtilsService } from '../../shared/utils/utils.service';
import { Model } from 'mongoose';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { AnalyticsService } from '../../shared/analytics/analytics.service';
import { Setting } from '../customization/setting/interface/setting.interface';
export declare class GtmService {
    private readonly settingModel;
    private readonly analyticsService;
    private readonly utilsService;
    private logger;
    constructor(settingModel: Model<Setting>, analyticsService: AnalyticsService, utilsService: UtilsService);
    getIP(req: Request): Promise<ResponsePayload>;
    trackThemePageView(req: Request, addGtmPageViewDto: AddGtmThemePageViewDto): Promise<ResponsePayload>;
    trackThemeViewContent(req: Request, addGtmViewContentDto: AddGtmThemeViewContentDto): Promise<ResponsePayload>;
    trackThemeAddToCart(req: Request, bodyData: any): Promise<ResponsePayload>;
    trackThemeInitialCheckout(req: Request, bodyData: any): Promise<ResponsePayload>;
    trackThemePurchase(req: Request, bodyData: any): Promise<ResponsePayload>;
}
