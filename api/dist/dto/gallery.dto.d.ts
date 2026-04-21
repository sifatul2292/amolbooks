import { PaginationDto } from './pagination.dto';
export declare class AddGalleryDto {
    name: string;
    url: string;
    type: string;
}
export declare class FilterGalleryDto {
    name: string;
    folder: any;
    type: string;
}
export declare class OptionGalleryDto {
    deleteMany: boolean;
}
export declare class UpdateGalleryDto {
    name: string;
    slug: string;
    type: string;
    ids: string[];
}
export declare class FilterAndPaginationGalleryDto {
    filter: FilterGalleryDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
