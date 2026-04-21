import { Model } from 'mongoose';
import { PreOrder } from '../../interfaces/common/pre-order.interface';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { AddPreOrderDto, FilterAndPaginationPreOrderDto, UpdatePreOrderStatusDto } from '../../dto/pre-order.dto';
import { UtilsService } from '../../shared/utils/utils.service';
export declare class PreOrderService {
    private readonly preOrderModel;
    private readonly utilsService;
    private logger;
    constructor(preOrderModel: Model<PreOrder>, utilsService: UtilsService);
    addPreOrder(addPreOrderDto: AddPreOrderDto): Promise<ResponsePayload>;
    getAllPreOrders(filterPreOrderDto: FilterAndPaginationPreOrderDto, searchQuery?: string): Promise<ResponsePayload>;
    getSinglePreOrderById(id: string, select?: string): Promise<ResponsePayload>;
    updatePreOrderStatus(id: string, updatePreOrderStatusDto: UpdatePreOrderStatusDto): Promise<ResponsePayload>;
    deletePreOrderById(id: string): Promise<ResponsePayload>;
}
