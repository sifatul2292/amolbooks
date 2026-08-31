import { PaginationDto } from "./pagination.dto";
export declare class AddIncompleteOrderDto {
    orderId?: string;
    name?: string;
    phoneNo?: string;
    email?: string;
    city?: string;
    shippingAddress?: string;
    division?: any;
    area?: any;
    zone?: any;
    paymentType?: string;
    paymentStatus?: string;
    orderStatus?: number;
    grandTotal?: number;
    subTotal?: number;
    discount?: number;
    deliveryCharge?: number;
    checkoutDate?: string;
    status?: string;
    note?: string;
    adminNote?: string;
    fraudChecker?: any;
    orderedItems?: any[];
    user?: string;
    attribution?: any;
}
export declare class UpdateIncompleteOrderDto {
    name?: string;
    phoneNo?: string;
    email?: string;
    city?: string;
    shippingAddress?: string;
    division?: any;
    area?: any;
    zone?: any;
    paymentType?: string;
    paymentStatus?: string;
    orderStatus?: number;
    grandTotal?: number;
    subTotal?: number;
    discount?: number;
    deliveryCharge?: number;
    checkoutDate?: string;
    status?: string;
    note?: string;
    adminNote?: string;
    fraudChecker?: any;
    orderedItems?: any[];
    attribution?: any;
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
