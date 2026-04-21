import { PaginationDto } from './pagination.dto';
export declare class AddBlogDto {
    name: string;
    nameEn: string;
    bannerImage: string;
    startDateTime: any;
    endDateTime: any;
}
export declare class FilterBlogDto {
    name: string;
    visibility: boolean;
    quantity: number;
    price: number;
}
export declare class OptionBlogDto {
    deleteMany: boolean;
}
export declare class UpdateBlogDto {
    name: string;
    blogCode: string;
    bannerImage: string;
    startDateTime: any;
    endDateTime: any;
    ids: string[];
}
export declare class FilterAndPaginationBlogDto {
    filter: FilterBlogDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
export declare class CheckBlogDto {
    blogCode: string;
    subTotal: number;
}
