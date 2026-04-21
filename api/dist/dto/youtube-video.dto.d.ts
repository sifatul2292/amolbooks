import { PaginationDto } from './pagination.dto';
export declare class AddYoutubeVideoDto {
    name: string;
    bannerImage: string;
    startDateTime: any;
    endDateTime: any;
}
export declare class FilterYoutubeVideoDto {
    name: string;
    visibility: boolean;
    quantity: number;
    price: number;
}
export declare class OptionYoutubeVideoDto {
    deleteMany: boolean;
}
export declare class UpdateYoutubeVideoDto {
    name: string;
    youtubeVideoCode: string;
    bannerImage: string;
    startDateTime: any;
    endDateTime: any;
    ids: string[];
}
export declare class FilterAndPaginationYoutubeVideoDto {
    filter: FilterYoutubeVideoDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
export declare class CheckYoutubeVideoDto {
    youtubeVideoCode: string;
    subTotal: number;
}
