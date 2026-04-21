import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../shared/utils/utils.service';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { AddBlogCommentDto, FilterAndPaginationBlogCommentDto, UpdateBlogCommentDto } from '../../dto/blog-comment.dto';
import { User } from '../../interfaces/user/user.interface';
import { Blog } from '../../interfaces/common/blog.interface';
import { Review } from '../../interfaces/common/review.interface';
export declare class BlogCommentService {
    private readonly blogCommentModel;
    private readonly userModel;
    private readonly blogModel;
    private configService;
    private utilsService;
    private logger;
    constructor(blogCommentModel: Model<Review>, userModel: Model<User>, blogModel: Model<Blog>, configService: ConfigService, utilsService: UtilsService);
    addBlogComment(user: User, addBlogCommentDto: AddBlogCommentDto): Promise<ResponsePayload>;
    addBlogCommentByAdmin(addBlogCommentDto: AddBlogCommentDto): Promise<ResponsePayload>;
    getBlogCommentByUserId(user: User): Promise<ResponsePayload>;
    getAllBlogCommentsByQuery(filterBlogCommentDto: FilterAndPaginationBlogCommentDto, searchQuery?: string): Promise<ResponsePayload>;
    getAllBlogComments(): Promise<ResponsePayload>;
    getBlogCommentById(id: string, select: string): Promise<ResponsePayload>;
    updateBlogCommentById(updateBlogCommentDto: UpdateBlogCommentDto): Promise<ResponsePayload>;
    updateBlogCommentByIdAndDelete(updateBlogCommentDto: UpdateBlogCommentDto): Promise<ResponsePayload>;
    deleteBlogCommentById(id: string): Promise<ResponsePayload>;
    deleteBlogCommentByLoggedinUserAndBlogCommentId(id: string, user: User): Promise<ResponsePayload>;
}
