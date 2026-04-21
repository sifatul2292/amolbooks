import { PaginationDto } from './pagination.dto';
export declare class AddNewsletterDto {
    email: string;
}
export declare class FilterNewsletterDto {
    email: string;
    createdAt: any;
}
export declare class OptionNewsletterDto {
    deleteMany: boolean;
}
export declare class UpdateNewsletterDto {
    name: string;
    email: string;
    ids: string[];
}
export declare class FilterAndPaginationNewsletterDto {
    filter: FilterNewsletterDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
