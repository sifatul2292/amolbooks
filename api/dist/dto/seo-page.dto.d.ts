import { PaginationDto } from './pagination.dto';
export declare class AddSeoPageDto {
    name: string;
}
export declare class FilterSeoPageDto {
    name: string;
    visibility: boolean;
    quantity: number;
    price: number;
}
export declare class OptionSeoPageDto {
    deleteMany: boolean;
}
export declare class UpdateSeoPageDto {
    name: string;
    slug: string;
    ids: string[];
}
export declare class FilterAndPaginationSeoPageDto {
    filter: FilterSeoPageDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
