import { Request } from 'express';
import { AddOrderDto, FilterAndPaginationOrderDto, GenerateInvoicesDto, OptionOrderDto, UpdateOrderDto, UpdateOrderStatusDto } from '../../../dto/order.dto';
import { AddIncompleteOrderDto, DeleteMultipleIncompleteOrderDto, FilterAndPaginationIncompleteOrderDto, UpdateIncompleteOrderDto } from '../../../dto/incomplete-order.dto';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { OrderService } from './order.service';
import { User } from '../../../interfaces/user/user.interface';
import { Admin } from '../../../interfaces/admin/admin.interface';
export declare class OrderController {
    private orderService;
    private logger;
    constructor(orderService: OrderService);
    receiveSteadfastWebhook(authorization: string, body: any): Promise<{
        status: string;
        message: string;
    }>;
    markBrowserPurchaseFired(body: {
        orderId?: string;
        transaction_id?: string;
        eventId?: string;
    }): Promise<ResponsePayload>;
    backfillSteadfastStatus(body: {
        limit?: number;
        retryFailed?: boolean;
    }): Promise<ResponsePayload>;
    syncSteadfastInReview(): Promise<ResponsePayload>;
    addOrder(addOrderDto: AddOrderDto, admin: Admin): Promise<ResponsePayload>;
    trackManualOrderMeta(id: string, body: {
        manualOrderSource?: string;
    }, admin: Admin): Promise<ResponsePayload>;
    addAiAssistOrder(addOrderDto: AddOrderDto, admin: Admin): Promise<ResponsePayload>;
    getManualOrderRequestStatus(requestId: string, admin: Admin): Promise<ResponsePayload>;
    updateDate(): Promise<ResponsePayload>;
    checkFraudSpy(body: {
        phone: string;
    }): Promise<ResponsePayload>;
    getRecentBuyersByProduct(slug: string): Promise<ResponsePayload>;
    getRepeatCustomers(): Promise<ResponsePayload>;
    addOrderByUser(addOrderDto: AddOrderDto, user: User, req: Request): Promise<ResponsePayload>;
    addOrderByAnonymous(addOrderDto: AddOrderDto, req: Request): Promise<ResponsePayload>;
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
    sendToCourier(id: string): Promise<ResponsePayload>;
    changeOrderStatus(id: string, updateOrderStatusDto: UpdateOrderStatusDto): Promise<ResponsePayload>;
    generateInvoiceById(id: string, shop: string): Promise<ResponsePayload>;
    getOrderByOrderId(orderId: string, select: string): Promise<ResponsePayload>;
    deleteOrderById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleOrderById(data: {
        ids: string[];
    }, checkUsage: boolean): Promise<ResponsePayload>;
    addIncompleteOrderByUser(addIncompleteOrderDto: AddIncompleteOrderDto, req: Request): Promise<ResponsePayload>;
    addIncompleteOrderByAnonymous(addIncompleteOrderDto: AddIncompleteOrderDto, req: Request): Promise<ResponsePayload>;
    getAllIncompleteOrders(filterDto: FilterAndPaginationIncompleteOrderDto, searchString: string): Promise<ResponsePayload>;
    getIncompleteOrderById(id: string): Promise<ResponsePayload>;
    updateIncompleteOrderById(id: string, updateIncompleteOrderDto: UpdateIncompleteOrderDto, req: Request): Promise<ResponsePayload>;
    updateIncompleteOrderByAdmin(id: string, updateIncompleteOrderDto: UpdateIncompleteOrderDto): Promise<ResponsePayload>;
    deleteMultipleIncompleteOrderById(deleteDto: DeleteMultipleIncompleteOrderDto): Promise<ResponsePayload>;
}
