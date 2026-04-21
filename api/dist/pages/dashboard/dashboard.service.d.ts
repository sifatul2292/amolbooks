import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../shared/utils/utils.service';
import { Order } from '../../interfaces/common/order.interface';
import { Admin } from '../../interfaces/admin/admin.interface';
import { User } from '../../interfaces/user/user.interface';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { Product } from '../../interfaces/common/product.interface';
import { FilterAndPaginationOrderDto } from '../../dto/order.dto';
export declare class DashboardService {
    private readonly adminModel;
    private readonly userModel;
    private readonly productModel;
    private readonly orderModel;
    private configService;
    private utilsService;
    private logger;
    constructor(adminModel: Model<Admin>, userModel: Model<User>, productModel: Model<Product>, orderModel: Model<Order>, configService: ConfigService, utilsService: UtilsService);
    getAdminDashboard(filterOrderDto: FilterAndPaginationOrderDto, searchQuery?: string): Promise<ResponsePayload>;
    getOrderDashboard(): Promise<ResponsePayload>;
    getUserCountDashboard(): Promise<ResponsePayload>;
    getAllOrdersForDashbord(filterOrderDto: FilterAndPaginationOrderDto, searchQuery?: string): Promise<ResponsePayload>;
    getSalesData(period: string): Promise<any>;
}
