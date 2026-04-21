import { PaginationDto } from './pagination.dto';
export declare class AddNotificationDto {
    name: string;
}
export declare class FilterNotificationDto {
    name: string;
    visibility: boolean;
    quantity: number;
    price: number;
}
export declare class OptionNotificationDto {
    deleteMany: boolean;
}
export declare class UpdateNotificationDto {
    name: string;
    slug: string;
    ids: string[];
}
export declare class FilterAndPaginationNotificationDto {
    filter: FilterNotificationDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
