import { PaginationDto } from './pagination.dto';
export declare class AddSubCategoryDto {
    name: string;
    slug: string;
    category: string;
    readOnly: boolean;
}
export declare class FilterSubCategoryDto {
    name: string;
    visibility: boolean;
    quantity: number;
    price: number;
}
export declare class OptionSubCategoryDto {
    deleteMany: boolean;
}
export declare class UpdateSubCategoryDto {
    name: string;
    slug: string;
    ids: string[];
}
export declare class FilterAndPaginationSubCategoryDto {
    filter: FilterSubCategoryDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
