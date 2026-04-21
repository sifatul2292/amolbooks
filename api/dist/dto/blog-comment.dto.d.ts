import { PaginationDto } from './pagination.dto';
export declare class AddBlogCommentDto {
    user: string;
    product: string;
    blog: string;
    blogComment: string;
    userName: string;
    rating: number;
    reply: string;
    replyDate: string;
    name: string;
}
export declare class FilterBlogCommentDto {
    name: string;
    visibility: boolean;
    quantity: number;
    price: number;
}
export declare class FilterBlogCommentGroupDto {
    isGroup: boolean;
    category: boolean;
    subCategory: boolean;
    brand: boolean;
}
export declare class OptionBlogCommentDto {
    deleteMany: boolean;
}
export declare class UpdateBlogCommentDto {
    product: any;
    blog: any;
    userName: string;
    replyDate: string;
    blogComment: string;
    rating: number;
    reply: string;
    status: any;
    ids: string[];
}
export declare class LikeDislikeDto {
    like: boolean;
    dislike: boolean;
    blogCommentId: string;
}
export declare class GetBlogCommentByIdsDto {
    ids: string[];
}
export declare class FilterAndPaginationBlogCommentDto {
    filter: FilterBlogCommentDto;
    filterGroup: FilterBlogCommentGroupDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
