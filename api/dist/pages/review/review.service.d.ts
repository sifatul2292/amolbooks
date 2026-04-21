import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../shared/utils/utils.service';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { AddReviewDto, FilterAndPaginationReviewDto, UpdateReviewDto } from '../../dto/review.dto';
import { Product } from '../../interfaces/common/product.interface';
import { Review } from 'src/interfaces/common/review.interface';
import { User } from '../../interfaces/user/user.interface';
export declare class ReviewService {
    private readonly reviewModel;
    private readonly productModel;
    private readonly userModel;
    private configService;
    private utilsService;
    private logger;
    constructor(reviewModel: Model<Review>, productModel: Model<Product>, userModel: Model<User>, configService: ConfigService, utilsService: UtilsService);
    addReview(user: User, addReviewDto: AddReviewDto): Promise<ResponsePayload>;
    addReviewByAdmin(addReviewDto: AddReviewDto): Promise<ResponsePayload>;
    getReviewByUserId(user: User): Promise<ResponsePayload>;
    getAllReviewsByQuery(filterReviewDto: FilterAndPaginationReviewDto, searchQuery?: string): Promise<ResponsePayload>;
    getAllReviews(): Promise<ResponsePayload>;
    getReviewById(id: string, select: string): Promise<ResponsePayload>;
    updateReviewById(updateReviewDto: UpdateReviewDto): Promise<ResponsePayload>;
    updateReviewByIdAndDelete(updateReviewDto: UpdateReviewDto): Promise<ResponsePayload>;
    deleteReviewById(id: string): Promise<ResponsePayload>;
    deleteReviewByLoggedinUserAndReviewId(id: string, user: User): Promise<ResponsePayload>;
}
