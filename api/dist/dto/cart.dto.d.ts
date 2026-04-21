import { PaginationDto } from './pagination.dto';
export declare class AddCartDto {
    product: string;
    specialPackage: string;
    cartType: number;
    selectedQty: number;
    selectedVariation: any | null;
}
export declare class FilterCartDto {
    name: string;
    visibility: boolean;
    quantity: number;
    price: number;
}
export declare class OptionCartDto {
    deleteMany: boolean;
}
export declare class UpdateCartDto {
    product: string;
    user: string;
    selectedQty: number;
    ids: string[];
}
export declare class UpdateCartQty {
    type: string;
    selectedQty: number;
    ids: string[];
}
export declare class CartItemDto {
    product: string;
    selectedQty: number;
    cartType: number;
    specialPackage: string;
}
export declare class FilterAndPaginationCartDto {
    filter: FilterCartDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
