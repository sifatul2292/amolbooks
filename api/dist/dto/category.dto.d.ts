import { PaginationDto } from './pagination.dto';
export declare class AddCategoryDto {
    name: string;
    slug: string;
}
export declare class FilterCategoryDto {
    name: string;
    visibility: boolean;
    quantity: number;
    price: number;
}
export declare class OptionCategoryDto {
    deleteMany: boolean;
}
export declare class UpdateCategoryDto {
    name: string;
    slug: string;
    status: string;
    ids: string[];
}
export declare class FilterAndPaginationCategoryDto {
    filter: FilterCategoryDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
