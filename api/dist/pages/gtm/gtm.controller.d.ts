import { Request } from 'express';
import { GtmService } from './gtm.service';
import { AddGtmThemePageViewDto, AddGtmThemeViewContentDto } from './dto/gtm.dto';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
export declare class GtmController {
    private gtmService;
    private logger;
    constructor(gtmService: GtmService);
    trackThemePageView(req: Request, addGtmThemePageViewDto: AddGtmThemePageViewDto): Promise<ResponsePayload>;
    trackThemeViewContent(req: Request, addGtmThemeViewContentDto: AddGtmThemeViewContentDto): Promise<ResponsePayload>;
    trackThemeAddToCart(req: Request, bodyData: any): Promise<ResponsePayload>;
    trackThemeInitialCheckout(req: Request, bodyData: any): Promise<ResponsePayload>;
    trackThemePurchase(req: Request, bodyData: any): Promise<ResponsePayload>;
}
