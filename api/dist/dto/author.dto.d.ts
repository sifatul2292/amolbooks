import { PaginationDto } from './pagination.dto';
export declare class AddAuthorDto {
    name: string;
    slug: string;
    bannerImage: string;
    startDateTime: any;
    endDateTime: any;
}
export declare class FilterAuthorDto {
    name: string;
    visibility: boolean;
    quantity: number;
    price: number;
}
export declare class OptionAuthorDto {
    deleteMany: boolean;
}
export declare class UpdateAuthorDto {
    name: string;
    slug: string;
    authorCode: string;
    bannerImage: string;
    startDateTime: any;
    endDateTime: any;
    ids: string[];
}
export declare class FilterAndPaginationAuthorDto {
    filter: FilterAuthorDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
export declare class CheckAuthorDto {
    authorCode: string;
    subTotal: number;
}
