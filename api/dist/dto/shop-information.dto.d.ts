import { PaginationDto } from './pagination.dto';
export declare class AddShopInformationDto {
    name: string;
}
export declare class FilterShopInformationDto {
    name: string;
    visibility: boolean;
    quantity: number;
    price: number;
}
export declare class OptionShopInformationDto {
    deleteMany: boolean;
}
export declare class UpdateShopInformationDto {
    name: string;
    slug: string;
    ids: string[];
}
export declare class FilterAndPaginationShopInformationDto {
    filter: FilterShopInformationDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
