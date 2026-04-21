import { PaginationDto } from './pagination.dto';
export declare class AddWishListDto {
    product: string;
    selectedQty: number;
}
export declare class FilterWishListDto {
    name: string;
    visibility: boolean;
    quantity: number;
    price: number;
}
export declare class OptionWishListDto {
    deleteMany: boolean;
}
export declare class UpdateWishListDto {
    product: string;
    user: string;
    selectedQty: number;
    ids: string[];
}
export declare class UpdateWishListQty {
    type: string;
    selectedQty: number;
    ids: string[];
}
export declare class FilterAndPaginationWishListDto {
    filter: FilterWishListDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
