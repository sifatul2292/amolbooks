import { PaginationDto } from './pagination.dto';
export declare class AddBannerCaroselDto {
    name: string;
    bannerImage: string;
    startDateTime: any;
    endDateTime: any;
}
export declare class FilterBannerCaroselDto {
    name: string;
    visibility: boolean;
    quantity: number;
    price: number;
}
export declare class OptionBannerCaroselDto {
    deleteMany: boolean;
}
export declare class UpdateBannerCaroselDto {
    name: string;
    bannerCaroselCode: string;
    bannerImage: string;
    startDateTime: any;
    endDateTime: any;
    ids: string[];
}
export declare class FilterAndPaginationBannerCaroselDto {
    filter: FilterBannerCaroselDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
export declare class CheckBannerCaroselDto {
    bannerCaroselCode: string;
    subTotal: number;
}
