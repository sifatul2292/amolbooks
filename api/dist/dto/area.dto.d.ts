import { PaginationDto } from './pagination.dto';
export declare class AddAreaDto {
    name: string;
}
export declare class FilterAreaDto {
    name: string;
}
export declare class OptionAreaDto {
    deleteMany: boolean;
}
export declare class UpdateAreaDto {
    name: string;
    ids: string[];
}
export declare class FilterAndPaginationAreaDto {
    filter: FilterAreaDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
