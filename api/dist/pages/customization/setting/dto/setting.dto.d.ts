import { PaginationDto } from 'src/dto/pagination.dto';
export declare class AddSettingDto {
    needRebuild: boolean;
}
export declare class FilterSettingDto {
    name: string;
    visibility: boolean;
    quantity: number;
    price: number;
}
export declare class OptionSettingDto {
    deleteMany: boolean;
}
export declare class UpdateSettingDto {
    deliveryInDhaka: number;
    deliveryOutsideDhaka: number;
    deliveryOutsideBD: number;
    ids: string[];
}
export declare class FilterAndPaginationSettingDto {
    filter: FilterSettingDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
