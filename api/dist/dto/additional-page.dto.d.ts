import { PaginationDto } from './pagination.dto';
export declare class AddAdditionalPageDto {
    name: string;
    slug: string;
}
export declare class FilterAdditionalPageDto {
    name: string;
}
export declare class OptionAdditionalPageDto {
    deleteMany: boolean;
}
export declare class UpdateAdditionalPageDto {
    name: string;
    ids: string[];
}
export declare class FilterAndPaginationAdditionalPageDto {
    filter: FilterAdditionalPageDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
