import { PaginationDto } from './pagination.dto';
export declare class AddOrderOfferDto {
    firstOrderDiscountAmount: number;
    firstOrderDiscountType: number;
    firstOrderMinAmount: number;
    giftEnabled: boolean;
    giftMinAmount: number;
    giftProduct: object;
    giftBuyXProductSlug: string;
    giftBuyXQty: number;
    giftLabel: string;
}
export declare class FilterOrderOfferDto {
    name: string;
    visibility: boolean;
    quantity: number;
    price: number;
}
export declare class OptionOrderOfferDto {
    deleteMany: boolean;
}
export declare class UpdateOrderOfferDto {
    firstOrderDiscountAmount: number;
    firstOrderDiscountType: number;
    firstOrderMinAmount: number;
    ids: string[];
}
export declare class FilterAndPaginationOrderOfferDto {
    filter: FilterOrderOfferDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
