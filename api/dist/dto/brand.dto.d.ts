import { PaginationDto } from './pagination.dto';
export declare class AddBrandDto {
    name: string;
}
export declare class FilterBrandDto {
    name: string;
    visibility: boolean;
    quantity: number;
    price: number;
}
export declare class OptionBrandDto {
    deleteMany: boolean;
}
export declare class UpdateBrandDto {
    name: string;
    slug: string;
    ids: string[];
}
export declare class FilterAndPaginationBrandDto {
    filter: FilterBrandDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
