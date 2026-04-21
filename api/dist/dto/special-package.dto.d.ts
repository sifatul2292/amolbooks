import { PaginationDto } from './pagination.dto';
export declare class AddSpecialPackageDto {
    name: string;
    products: any[];
}
export declare class FilterSpecialPackageDto {
    name: string;
    visibility: boolean;
    quantity: number;
    price: number;
}
export declare class OptionSpecialPackageDto {
    deleteMany: boolean;
}
export declare class UpdateSpecialPackageDto {
    name: string;
    products: any[];
    slug: string;
    ids: string[];
}
export declare class FilterAndPaginationSpecialPackageDto {
    filter: FilterSpecialPackageDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
