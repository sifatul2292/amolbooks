import { DashboardService } from './dashboard.service';
import { DecisionDashboardService } from './decision-dashboard.service';
import { MetaTrackingHealthService } from './meta-tracking-health.service';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
export declare class DashboardController {
    private dashboardService;
    private decisionDashboardService;
    private metaTrackingHealthService;
    private logger;
    constructor(dashboardService: DashboardService, decisionDashboardService: DecisionDashboardService, metaTrackingHealthService: MetaTrackingHealthService);
    getMetaTrackingHealth(days: string): Promise<ResponsePayload>;
    getAdminDashboard(searchString: string): Promise<ResponsePayload>;
    getOrderDashboard(): Promise<ResponsePayload>;
    getSalesData(period: string): Promise<any>;
    getSales(period: string): Promise<any>;
    getProfitAnalytics(startDate: string, endDate: string): Promise<ResponsePayload>;
    getDecisionAnalytics(startDate: string, endDate: string): Promise<any>;
    saveOrderCosts(orderId: string, body: any): Promise<any>;
    markRecommendationActedOn(body: any): Promise<any>;
    getProductsSold(startDate: string, endDate: string): Promise<ResponsePayload>;
    getTopProducts(startDate: string, endDate: string): Promise<ResponsePayload>;
    getManualSales(startDate: string, endDate: string): Promise<any>;
    addManualSale(body: any): Promise<any>;
    deleteManualSale(id: string): Promise<any>;
}
