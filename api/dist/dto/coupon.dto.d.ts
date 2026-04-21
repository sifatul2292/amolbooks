import { PaginationDto } from './pagination.dto';
export declare class AddCouponDto {
    name: string;
    couponCode: string;
    bannerImage: string;
    startDateTime: any;
    endDateTime: any;
}
export declare class FilterCouponDto {
    name: string;
    visibility: boolean;
    quantity: number;
    price: number;
}
export declare class OptionCouponDto {
    deleteMany: boolean;
}
export declare class UpdateCouponDto {
    name: string;
    couponCode: string;
    bannerImage: string;
    startDateTime: any;
    endDateTime: any;
    ids: string[];
}
export declare class FilterAndPaginationCouponDto {
    filter: FilterCouponDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
export declare class CheckCouponDto {
    couponCode: string;
    subTotal: number;
}
