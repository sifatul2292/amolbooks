import { PaginationDto } from './pagination.dto';
export declare class AddFileFolderDto {
    name: string;
}
export declare class FilterFileFolderDto {
    name: string;
}
export declare class OptionFileFolderDto {
    deleteMany: boolean;
}
export declare class UpdateFileFolderDto {
    name: string;
    slug: string;
    ids: string[];
}
export declare class FilterAndPaginationFileFolderDto {
    filter: FilterFileFolderDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
