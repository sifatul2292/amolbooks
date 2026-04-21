import { PreOrderService } from './pre-order.service';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { AddPreOrderDto, FilterAndPaginationPreOrderDto, UpdatePreOrderStatusDto } from '../../dto/pre-order.dto';
export declare class PreOrderController {
    private readonly preOrderService;
    constructor(preOrderService: PreOrderService);
    addPreOrder(addPreOrderDto: AddPreOrderDto): Promise<ResponsePayload>;
    getAllPreOrders(filterPreOrderDto: FilterAndPaginationPreOrderDto, searchString: string): Promise<ResponsePayload>;
    getSinglePreOrderById(id: string, select: string): Promise<ResponsePayload>;
    updatePreOrderStatus(id: string, updatePreOrderStatusDto: UpdatePreOrderStatusDto): Promise<ResponsePayload>;
    deletePreOrderById(id: string): Promise<ResponsePayload>;
}
