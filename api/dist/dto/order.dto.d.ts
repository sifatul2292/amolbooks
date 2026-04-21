import { PaginationDto } from './pagination.dto';
export declare class AddOrderDto {
    name: string;
    phoneNo: string;
    email: string;
    orderId: string;
    city: string;
    paymentType: string;
    shippingAddress: string;
    user: string;
    coupon: string;
}
export declare class FilterOrderDto {
    name: string;
    visibility: boolean;
    quantity: number;
    price: number;
}
export declare class OptionOrderDto {
    deleteMany: boolean;
}
export declare class UpdateOrderDto {
    name: string;
    phoneNo: string;
    orderStatus: any;
    city: string;
    shippingAddress: string;
    ids: string[];
}
export declare class UpdateOrderStatusDto {
    orderStatus: number;
    courierLink: string;
    orderId: string;
    name: string;
    phoneNo: string;
}
export declare class GenerateInvoicesDto {
    ids: string[];
}
export declare class FilterAndPaginationOrderDto {
    filter: FilterOrderDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
