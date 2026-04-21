import { PaginationDto } from './pagination.dto';
export declare class AddProfileDto {
    name: string;
    username: string;
    email: string;
    phoneNo: string;
    image: string;
}
export declare class FilterProfileDto {
    name: string;
    visibility: boolean;
    quantity: number;
    price: number;
}
export declare class OptionProfileDto {
    deleteMany: boolean;
}
export declare class UpdateProfileDto {
    name: string;
    profileCode: string;
    image: string;
    startDateTime: any;
    endDateTime: any;
    ids: string[];
}
export declare class FilterAndPaginationProfileDto {
    filter: FilterProfileDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
export declare class CheckProfileDto {
    profileCode: string;
    subTotal: number;
}
