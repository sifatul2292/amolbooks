import { PaginationDto } from './pagination.dto';
export declare class AddPreOrderDto {
    product: string;
    name: string;
    phoneNo: string;
    email?: string;
    user?: string;
}
export declare class FilterAndPaginationPreOrderDto {
    filter?: any;
    pagination?: PaginationDto;
    sort?: any;
    select?: any;
}
export declare class UpdatePreOrderStatusDto {
    status: 'pending' | 'completed' | 'cancelled';
}
