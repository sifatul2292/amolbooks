import { PaginationDto } from './pagination.dto';
export declare class AddAuthorDto {
    name: string;
    slug: string;
    nameEn?: string;
    image?: string;
    address?: string;
    addressEn?: string;
    description?: string;
    descriptionEn?: string;
    birthDate?: Date | string;
    priority?: number | string;
}
export declare class FilterAuthorDto {
    name: string;
    visibility: boolean;
    quantity: number;
    price: number;
}
export declare class OptionAuthorDto {
    deleteMany: boolean;
}
export declare class UpdateAuthorDto {
    name?: string;
    slug?: string;
    nameEn?: string;
    image?: string;
    address?: string;
    addressEn?: string;
    description?: string;
    descriptionEn?: string;
    birthDate?: Date | string;
    priority?: number | string;
    ids: string[];
}
export declare class FilterAndPaginationAuthorDto {
    filter: FilterAuthorDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
export declare class CheckAuthorDto {
    authorCode: string;
    subTotal: number;
}
