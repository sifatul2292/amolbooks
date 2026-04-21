import { DashboardService } from './dashboard.service';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
export declare class DashboardController {
    private dashboardService;
    private logger;
    constructor(dashboardService: DashboardService);
    getAdminDashboard(searchString: string): Promise<ResponsePayload>;
    getOrderDashboard(): Promise<ResponsePayload>;
    getSalesData(period: string): Promise<any>;
    getSales(period: string): Promise<any>;
}
