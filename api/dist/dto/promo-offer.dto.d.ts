import { PaginationDto } from './pagination.dto';
export declare class AddPromoOfferDto {
    title: string;
    startDateTime: any;
    endDateTime: any;
    products: any[];
}
export declare class FilterPromoOfferDto {
    title: string;
    visibility: boolean;
    quantity: number;
    price: number;
}
export declare class OptionPromoOfferDto {
    deleteMany: boolean;
}
export declare class UpdatePromoOfferDto {
    title: string;
    startDateTime: any;
    endDateTime: any;
    products: any[];
    slug: string;
    ids: string[];
}
export declare class FilterAndPaginationPromoOfferDto {
    filter: FilterPromoOfferDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
