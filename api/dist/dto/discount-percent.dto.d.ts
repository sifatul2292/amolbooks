import { PaginationDto } from './pagination.dto';
export declare class AddDiscountPercentDto {
    discountType: string;
}
export declare class FilterDiscountPercentDto {
    discountType: string;
    visibility: boolean;
    quantity: number;
    price: number;
}
export declare class OptionDiscountPercentDto {
    deleteMany: boolean;
}
export declare class UpdateDiscountPercentDto {
    discountType: string;
    slug: string;
    ids: string[];
}
export declare class FilterAndPaginationDiscountPercentDto {
    filter: FilterDiscountPercentDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
