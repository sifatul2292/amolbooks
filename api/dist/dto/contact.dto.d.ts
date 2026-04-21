import { PaginationDto } from './pagination.dto';
export declare class AddContactDto {
    name: string;
    email: string;
    phone: string;
    address: string;
    queryType: string;
    subject: string;
    message: string;
    receivingMails: [string];
    emailSent: boolean;
}
export declare class FilterContactDto {
    name: string;
    email: string;
    createdAt: any;
}
export declare class OptionContactDto {
    deleteMany: boolean;
}
export declare class UpdateContactDto {
    name: string;
    email: string;
    phoneNo: string;
    address: string;
    queryType: string;
    subject: string;
    message: string;
    receivingMails: [string];
    emailSent: boolean;
    ids: string[];
}
export declare class FilterAndPaginationContactDto {
    filter: FilterContactDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
