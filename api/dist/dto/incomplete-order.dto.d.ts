import { PaginationDto } from './pagination.dto';
export declare class AddIncompleteOrderDto {
    orderId?: string;
    name?: string;
    phoneNo?: string;
    email?: string;
    city?: string;
    shippingAddress?: string;
    paymentType?: string;
    paymentStatus?: string;
    orderStatus?: number;
    grandTotal?: number;
    subTotal?: number;
    discount?: number;
    checkoutDate?: string;
    status?: string;
    orderedItems?: any[];
    user?: string;
}
export declare class UpdateIncompleteOrderDto {
    name?: string;
    phoneNo?: string;
    email?: string;
    city?: string;
    shippingAddress?: string;
    paymentType?: string;
    paymentStatus?: string;
    orderStatus?: number;
    grandTotal?: number;
    subTotal?: number;
    discount?: number;
    checkoutDate?: string;
    status?: string;
    orderedItems?: any[];
}
export declare class FilterIncompleteOrderDto {
    name?: string;
    phoneNo?: string;
    status?: string;
}
export declare class FilterAndPaginationIncompleteOrderDto {
    filter?: object;
    pagination?: PaginationDto;
    sort?: object;
    select?: any;
}
export declare class DeleteMultipleIncompleteOrderDto {
    ids: string[];
}
