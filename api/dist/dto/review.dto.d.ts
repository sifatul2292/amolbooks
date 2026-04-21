import { PaginationDto } from './pagination.dto';
export declare class AddReviewDto {
    user: string;
    product: string;
    review: string;
    userName: string;
    rating: number;
    reply: string;
    replyDate: string;
    name: string;
}
export declare class FilterReviewDto {
    name: string;
    visibility: boolean;
    quantity: number;
    price: number;
}
export declare class FilterReviewGroupDto {
    isGroup: boolean;
    category: boolean;
    subCategory: boolean;
    brand: boolean;
}
export declare class OptionReviewDto {
    deleteMany: boolean;
}
export declare class UpdateReviewDto {
    product: any;
    userName: string;
    replyDate: string;
    review: string;
    rating: number;
    reply: string;
    status: any;
    ids: string[];
}
export declare class LikeDislikeDto {
    like: boolean;
    dislike: boolean;
    reviewId: string;
}
export declare class GetReviewByIdsDto {
    ids: string[];
}
export declare class FilterAndPaginationReviewDto {
    filter: FilterReviewDto;
    filterGroup: FilterReviewGroupDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
