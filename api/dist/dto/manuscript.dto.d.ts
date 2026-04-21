import { PaginationDto } from './pagination.dto';
export declare class AddManuscriptDto {
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
export declare class FilterManuscriptDto {
    name: string;
    email: string;
    createdAt: any;
}
export declare class OptionManuscriptDto {
    deleteMany: boolean;
}
export declare class UpdateManuscriptDto {
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
export declare class FilterAndPaginationManuscriptDto {
    filter: FilterManuscriptDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
