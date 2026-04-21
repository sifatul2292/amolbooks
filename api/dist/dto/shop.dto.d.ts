import { PaginationDto } from './pagination.dto';
export declare class AddShopDto {
    name: string;
}
export declare class FilterShopDto {
    name: string;
}
export declare class OptionShopDto {
    deleteMany: boolean;
}
export declare class UpdateShopDto {
    name: string;
    ids: string[];
}
export declare class FilterAndPaginationShopDto {
    filter: FilterShopDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
