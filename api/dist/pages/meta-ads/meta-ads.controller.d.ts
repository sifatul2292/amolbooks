import { MetaAdsService } from './meta-ads.service';
export declare class MetaAdsController {
    private readonly metaAdsService;
    constructor(metaAdsService: MetaAdsService);
    getAuthUrl(): {
        success: boolean;
        message: string;
        url?: undefined;
    } | {
        success: boolean;
        url: string;
        message?: undefined;
    };
    callback(code: string, res: any): Promise<any>;
    getStatus(): Promise<any>;
    getSpend(startDate: string, endDate: string): Promise<any>;
    sync(body: {
        startDate?: string;
        endDate?: string;
    }): Promise<any>;
    setAccount(body: {
        adAccountId: string;
    }): Promise<any>;
    manualSpend(body: {
        date: string;
        spend: number;
    }): Promise<any>;
    deleteSpend(id: string): Promise<any>;
    diagnose(): Promise<any>;
    disconnect(): Promise<any>;
    getExpenses(startDate: string, endDate: string): {
        success: boolean;
        data: any[];
    };
    addExpense(body: any): {
        success: boolean;
        data: any;
    };
    deleteExpense(id: string): {
        success: boolean;
    };
}
