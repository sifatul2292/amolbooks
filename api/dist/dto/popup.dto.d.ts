import { PaginationDto } from './pagination.dto';
export declare class AddPopupDto {
    name: string;
}
export declare class FilterPopupDto {
    name: string;
    visibility: boolean;
    quantity: number;
    price: number;
}
export declare class OptionPopupDto {
    deleteMany: boolean;
}
export declare class UpdatePopupDto {
    name: string;
    slug: string;
    ids: string[];
}
export declare class FilterAndPaginationPopupDto {
    filter: FilterPopupDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
