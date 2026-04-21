import { PaginationDto } from './pagination.dto';
export declare class AddActivitiesCommentDto {
    user: string;
    product: string;
    activities: string;
    activitiesComment: string;
    userName: string;
    rating: number;
    reply: string;
    replyDate: string;
    name: string;
}
export declare class FilterActivitiesCommentDto {
    name: string;
    visibility: boolean;
    quantity: number;
    price: number;
}
export declare class FilterActivitiesCommentGroupDto {
    isGroup: boolean;
    category: boolean;
    subCategory: boolean;
    brand: boolean;
}
export declare class OptionActivitiesCommentDto {
    deleteMany: boolean;
}
export declare class UpdateActivitiesCommentDto {
    product: any;
    activities: any;
    userName: string;
    replyDate: string;
    activitiesComment: string;
    rating: number;
    reply: string;
    status: any;
    ids: string[];
}
export declare class LikeDislikeDto {
    like: boolean;
    dislike: boolean;
    activitiesCommentId: string;
}
export declare class GetActivitiesCommentByIdsDto {
    ids: string[];
}
export declare class FilterAndPaginationActivitiesCommentDto {
    filter: FilterActivitiesCommentDto;
    filterGroup: FilterActivitiesCommentGroupDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
