import { PaginationDto } from './pagination.dto';
export declare class AddTagDto {
    name: string;
    slug: string;
}
export declare class FilterTagDto {
    name: string;
    visibility: boolean;
    quantity: number;
    price: number;
}
export declare class OptionTagDto {
    deleteMany: boolean;
}
export declare class UpdateTagDto {
    name: string;
    slug: string;
    ids: string[];
}
export declare class FilterAndPaginationTagDto {
    filter: FilterTagDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
