import { PaginationDto } from './pagination.dto';
export declare class AddOtpDto {
    phoneNo: string;
    email?: string;
}
export declare class ValidateOtpDto {
    phoneNo: string;
    email?: string;
    code: string;
}
export declare class FilterOtpDto {
    phoneNo: string;
}
export declare class OptionOtpDto {
    deleteMany: boolean;
}
export declare class UpdateOtpDto {
    phoneNo: string;
    ids: string[];
}
export declare class FilterAndPaginationOtpDto {
    filter: FilterOtpDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
