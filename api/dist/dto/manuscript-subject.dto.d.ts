import { PaginationDto } from './pagination.dto';
export declare class AddManuscriptSubjectDto {
    name: string;
}
export declare class FilterManuscriptSubjectDto {
    name: string;
    visibility: boolean;
    quantity: number;
    price: number;
}
export declare class OptionManuscriptSubjectDto {
    deleteMany: boolean;
}
export declare class UpdateManuscriptSubjectDto {
    name: string;
    slug: string;
    ids: string[];
}
export declare class FilterAndPaginationManuscriptSubjectDto {
    filter: FilterManuscriptSubjectDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
