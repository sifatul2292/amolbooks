import { PaginationDto } from './pagination.dto';
export declare class AddPublisherDto {
    name: string;
    slug: string;
    bannerImage: string;
    startDateTime: any;
    endDateTime: any;
}
export declare class FilterPublisherDto {
    name: string;
    visibility: boolean;
    quantity: number;
    price: number;
}
export declare class OptionPublisherDto {
    deleteMany: boolean;
}
export declare class UpdatePublisherDto {
    name: string;
    slug: string;
    publisherCode: string;
    bannerImage: string;
    startDateTime: any;
    endDateTime: any;
    ids: string[];
}
export declare class FilterAndPaginationPublisherDto {
    filter: FilterPublisherDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
export declare class CheckPublisherDto {
    publisherCode: string;
    subTotal: number;
}
