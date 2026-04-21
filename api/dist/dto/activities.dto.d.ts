import { PaginationDto } from './pagination.dto';
export declare class AddActivitiesDto {
    name: string;
    bannerImage: string;
    startDateTime: any;
    endDateTime: any;
}
export declare class FilterActivitiesDto {
    name: string;
    visibility: boolean;
    quantity: number;
    price: number;
}
export declare class OptionActivitiesDto {
    deleteMany: boolean;
}
export declare class UpdateActivitiesDto {
    name: string;
    activitiesCode: string;
    bannerImage: string;
    startDateTime: any;
    endDateTime: any;
    ids: string[];
}
export declare class FilterAndPaginationActivitiesDto {
    filter: FilterActivitiesDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
export declare class CheckActivitiesDto {
    activitiesCode: string;
    subTotal: number;
}
