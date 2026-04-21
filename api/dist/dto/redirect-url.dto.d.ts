import { PaginationDto } from './pagination.dto';
export declare class AddRedirectUrlDto {
    name: string;
    bannerImage: string;
    startDateTime: any;
    endDateTime: any;
}
export declare class FilterRedirectUrlDto {
    name: string;
    visibility: boolean;
    quantity: number;
    price: number;
}
export declare class OptionRedirectUrlDto {
    deleteMany: boolean;
}
export declare class UpdateRedirectUrlDto {
    name: string;
    redirectUrlCode: string;
    bannerImage: string;
    startDateTime: any;
    endDateTime: any;
    ids: string[];
}
export declare class FilterAndPaginationRedirectUrlDto {
    filter: FilterRedirectUrlDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
export declare class CheckRedirectUrlDto {
    redirectUrlCode: string;
    subTotal: number;
}
