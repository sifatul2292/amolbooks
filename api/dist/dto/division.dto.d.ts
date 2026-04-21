import { PaginationDto } from './pagination.dto';
export declare class AddDivisionDto {
    name: string;
}
export declare class FilterDivisionDto {
    name: string;
}
export declare class OptionDivisionDto {
    deleteMany: boolean;
}
export declare class UpdateDivisionDto {
    name: string;
    ids: string[];
}
export declare class FilterAndPaginationDivisionDto {
    filter: FilterDivisionDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
