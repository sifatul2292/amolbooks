import { PaginationDto } from './pagination.dto';
export declare class AddProductDto {
    name: string;
    nameEn: string;
    quantity: number;
}
export declare class FilterProductDto {
    name: string;
    visibility: boolean;
    quantity: any;
    price: number;
}
export declare class FilterProductGroupDto {
    isGroup: boolean;
    category: boolean;
    subCategory: boolean;
    brand: boolean;
    publisher: boolean;
}
export declare class OptionProductDto {
    deleteMany: boolean;
}
export declare class UpdateProductDto {
    name: string;
    nameEn: string;
    slug: string;
    quantity: number;
    ids: string[];
}
export declare class GetProductByIdsDto {
    ids: string[];
}
export declare class FilterAndPaginationProductDto {
    filter: FilterProductDto;
    filterGroup: FilterProductGroupDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
export declare class ProductFilterCatalogDto {
    category: boolean;
    brand: boolean;
    tag: boolean;
    subCategory: boolean;
    rating: boolean;
}
