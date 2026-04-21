import { PaginationDto } from './pagination.dto';
export declare class AddStoreInfoDto {
    storeName: string;
    address: string;
    phoneNumber: string;
    map: string;
    district: string;
    country: string;
}
export declare class FilterStoreInfoDto {
    storeName: string;
    district: string;
    country: string;
}
export declare class OptionStoreInfoDto {
    deleteMany: boolean;
}
export declare class UpdateStoreInfoDto {
    title: string;
    storeName: string;
    address: string;
    phoneNumber: string;
    map: string;
    district: string;
    country: string;
    ids: string[];
}
export declare class FilterAndPaginationStoreInfoDto {
    filter: FilterStoreInfoDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
