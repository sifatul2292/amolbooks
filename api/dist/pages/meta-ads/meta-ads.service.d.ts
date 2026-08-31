import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
export declare class MetaAdsService {
    private readonly spendModel;
    private readonly tokenModel;
    private readonly configService;
    private readonly logger;
    constructor(spendModel: Model<any>, tokenModel: Model<any>, configService: ConfigService);
    getAuthUrl(): string;
    private graphGetJson;
    handleCallback(code: string): Promise<any>;
    getStatus(): Promise<any>;
    private httpsGet;
    private pickPurchaseAction;
    syncSpend(startDate?: string, endDate?: string): Promise<any>;
    getSpend(startDate: string, endDate: string): Promise<any>;
    saveManualSpend(date: string, spend: number): Promise<any>;
    deleteSpend(id: string): Promise<any>;
    setAdAccountId(adAccountId: string): Promise<any>;
    diagnose(): Promise<any>;
    disconnect(): Promise<any>;
    private today;
    private datesBetween;
    private daysAgo;
}
