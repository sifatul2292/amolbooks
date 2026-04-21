import { PaginationDto } from './pagination.dto';
export declare class AddPraptisthanaDto {
    name: string;
    bannerImage: string;
    startDateTime: any;
    endDateTime: any;
}
export declare class FilterPraptisthanaDto {
    name: string;
    visibility: boolean;
    quantity: number;
    price: number;
}
export declare class OptionPraptisthanaDto {
    deleteMany: boolean;
}
export declare class UpdatePraptisthanaDto {
    name: string;
    praptisthanaCode: string;
    bannerImage: string;
    startDateTime: any;
    endDateTime: any;
    ids: string[];
}
export declare class FilterAndPaginationPraptisthanaDto {
    filter: FilterPraptisthanaDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
export declare class CheckPraptisthanaDto {
    praptisthanaCode: string;
    subTotal: number;
}
