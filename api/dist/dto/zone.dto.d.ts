import { PaginationDto } from './pagination.dto';
export declare class AddZoneDto {
    name: string;
}
export declare class FilterZoneDto {
    name: string;
}
export declare class OptionZoneDto {
    deleteMany: boolean;
}
export declare class UpdateZoneDto {
    name: string;
    ids: string[];
}
export declare class FilterAndPaginationZoneDto {
    filter: FilterZoneDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
