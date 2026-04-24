import { AddOrderDto, FilterAndPaginationOrderDto, GenerateInvoicesDto, OptionOrderDto, UpdateOrderDto, UpdateOrderStatusDto } from '../../../dto/order.dto';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { OrderService } from './order.service';
import { User } from '../../../interfaces/user/user.interface';
import { Admin } from '../../../interfaces/admin/admin.interface';
export declare class OrderController {
    private orderService;
    private logger;
    constructor(orderService: OrderService);
    addOrder(addOrderDto: AddOrderDto, admin: Admin): Promise<ResponsePayload>;
    updateDate(): Promise<ResponsePayload>;
    checkFraudSpy(body: {
        phone: string;
    }): Promise<ResponsePayload>;
    addOrderByUser(addOrderDto: AddOrderDto, user: User): Promise<ResponsePayload>;
    addOrderByAnonymous(addOrderDto: AddOrderDto): Promise<ResponsePayload>;
    insertManyOrder(body: {
        data: AddOrderDto[];
        option: OptionOrderDto;
    }): Promise<ResponsePayload>;
    generateInvoices(dto: GenerateInvoicesDto): Promise<ResponsePayload>;
    getAllOrders(filterOrderDto: FilterAndPaginationOrderDto, searchString: string): Promise<ResponsePayload>;
    getOrdersByUser(user: User, filterOrderDto: FilterAndPaginationOrderDto, searchString: string): Promise<ResponsePayload>;
    getSalesStatsByFilter(filterType: 'publisher' | 'category', filterId: string): Promise<ResponsePayload>;
    getOrderById(id: string, select: string): Promise<ResponsePayload>;
    updateOrderById(id: string, updateOrderDto: UpdateOrderDto): Promise<ResponsePayload>;
    updateMultipleOrderById(updateOrderDto: UpdateOrderDto): Promise<ResponsePayload>;
    updateOrderSessionKey(id: string, updateOrderDto: any): Promise<ResponsePayload>;
    changeOrderStatus(id: string, updateOrderStatusDto: UpdateOrderStatusDto): Promise<ResponsePayload>;
    generateInvoiceById(id: string, shop: string): Promise<ResponsePayload>;
    getOrderByOrderId(orderId: string, select: string): Promise<ResponsePayload>;
    deleteOrderById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleOrderById(data: {
        ids: string[];
    }, checkUsage: boolean): Promise<ResponsePayload>;
}
