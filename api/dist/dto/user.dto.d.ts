import { PaginationDto } from './pagination.dto';
export declare class CreateUserDto {
    name: string;
    username: string;
    phoneNo: string;
    email: string;
    registrationType: 'default' | 'phone' | 'email' | 'facebook' | 'google';
    password: string;
    gender: string;
}
export declare class CreateSocialUserDto {
    name: string;
    username: string;
    registrationType: string;
    phoneNo: string;
    gender: string;
}
export declare class CheckUserRegistrationDto {
    phoneNo: string;
    username: string;
}
export declare class AuthUserDto {
    username: string;
    password: string;
}
export declare class AuthSocialUserDto {
    username: string;
}
export declare class UserSelectFieldDto {
    select: string;
}
export declare class FilterUserDto {
    hasAccess: boolean;
    gender: string;
    _id: any;
}
export declare class FilterAndPaginationUserDto {
    filter: FilterUserDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
export declare class UpdateUserDto {
    name: string;
    username: string;
    password: string;
    newPassword: string;
    gender: string;
}
export declare class AddAddressDto {
    user: string;
    phoneNo: string;
    city: string;
    address: string;
    addressType: string;
}
export declare class UpdateAddressDto {
    phoneNo: string;
    city: string;
    address: string;
    addressType: string;
}
export declare class ResetPasswordDto {
    password: string;
    username: string;
    phoneNo: string;
}
export declare class CheckUserDto {
    phoneNo: string;
    email: string;
}
export declare class FollowUnfollowAuthor {
    type: 'follow' | 'unfollow';
    author: string;
}
