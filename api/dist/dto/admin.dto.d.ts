import { PaginationDto } from './pagination.dto';
export declare class CreateAdminDto {
    name: string;
    username: string;
    password: string;
    role: string;
    permissions: string[];
    gender: string;
}
export declare class AuthAdminDto {
    username: string;
    password: string;
}
export declare class AdminSelectFieldDto {
    select: string;
}
export declare class FilterAdminDto {
    hasAccess: boolean;
    role: string;
    gender: string;
}
export declare class FilterAndPaginationAdminDto {
    filter: FilterAdminDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
export declare class UpdateAdminDto {
    name: string;
    username: string;
    newPassword: string;
    password: string;
    role: string;
    permissions: string[];
    gender: string;
    ids: string[];
}
