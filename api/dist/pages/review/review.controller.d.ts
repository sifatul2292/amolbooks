import { AddReviewDto, FilterAndPaginationReviewDto, UpdateReviewDto } from '../../dto/review.dto';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { ReviewService } from './review.service';
import { User } from '../../interfaces/user/user.interface';
export declare class ReviewController {
    private reviewService;
    private logger;
    constructor(reviewService: ReviewService);
    addReview(user: User, addReviewDto: AddReviewDto): Promise<ResponsePayload>;
    addReviewByAdmin(addReviewDto: AddReviewDto): Promise<ResponsePayload>;
    getAllReviews(): Promise<ResponsePayload>;
    getAllReviewsByQuery(filterReviewDto: FilterAndPaginationReviewDto, searchString: string): Promise<ResponsePayload>;
    getCartByUserId(user: User): Promise<ResponsePayload>;
    getReviewById(id: string, select: string): Promise<ResponsePayload>;
    updateReviewById(updateReviewDto: UpdateReviewDto): Promise<ResponsePayload>;
    updateReviewByIdAndDelete(updateReviewDto: UpdateReviewDto): Promise<ResponsePayload>;
    deleteReviewById(id: string): Promise<ResponsePayload>;
    deleteReviewByLoggedinUserAndReviewId(id: string, user: User): Promise<ResponsePayload>;
}
