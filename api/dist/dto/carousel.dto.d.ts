import { PaginationDto } from './pagination.dto';
export declare class AddCarouselDto {
    name: string;
    bannerImage: string;
    startDateTime: any;
    endDateTime: any;
}
export declare class FilterCarouselDto {
    name: string;
    visibility: boolean;
    quantity: number;
    price: number;
}
export declare class OptionCarouselDto {
    deleteMany: boolean;
}
export declare class UpdateCarouselDto {
    name: string;
    carouselCode: string;
    bannerImage: string;
    startDateTime: any;
    endDateTime: any;
    ids: string[];
}
export declare class FilterAndPaginationCarouselDto {
    filter: FilterCarouselDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
export declare class CheckCarouselDto {
    carouselCode: string;
    subTotal: number;
}
