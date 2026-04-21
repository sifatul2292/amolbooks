import { PaginationDto } from './pagination.dto';
export declare class AddReaderClassDto {
    name: string;
}
export declare class FilterReaderClassDto {
    name: string;
    visibility: boolean;
    quantity: number;
    price: number;
}
export declare class OptionReaderClassDto {
    deleteMany: boolean;
}
export declare class UpdateReaderClassDto {
    name: string;
    slug: string;
    ids: string[];
}
export declare class FilterAndPaginationReaderClassDto {
    filter: FilterReaderClassDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
