import { PaginationDto } from './pagination.dto';
export declare class AddMultiPromoOfferDto {
    title: string;
    startDateTime: any;
    endDateTime: any;
    products: any[];
}
export declare class FilterMultiPromoOfferDto {
    title: string;
    visibility: boolean;
    quantity: number;
    price: number;
}
export declare class OptionMultiPromoOfferDto {
    deleteMany: boolean;
}
export declare class UpdateMultiPromoOfferDto {
    title: string;
    startDateTime: any;
    endDateTime: any;
    products: any[];
    slug: string;
    ids: string[];
}
export declare class FilterAndPaginationMultiPromoOfferDto {
    filter: FilterMultiPromoOfferDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
