import { AddBlogCommentDto, FilterAndPaginationBlogCommentDto, UpdateBlogCommentDto } from '../../dto/blog-comment.dto';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { BlogCommentService } from './blog-comment.service';
import { User } from '../../interfaces/user/user.interface';
export declare class BlogCommentController {
    private blogCommentService;
    private logger;
    constructor(blogCommentService: BlogCommentService);
    addBlogComment(user: User, addBlogCommentDto: AddBlogCommentDto): Promise<ResponsePayload>;
    addBlogCommentByAdmin(addBlogCommentDto: AddBlogCommentDto): Promise<ResponsePayload>;
    getAllBlogComments(): Promise<ResponsePayload>;
    getAllBlogCommentsByQuery(filterBlogCommentDto: FilterAndPaginationBlogCommentDto, searchString: string): Promise<ResponsePayload>;
    getCartByUserId(user: User): Promise<ResponsePayload>;
    getBlogCommentById(id: string, select: string): Promise<ResponsePayload>;
    updateBlogCommentById(updateBlogCommentDto: UpdateBlogCommentDto): Promise<ResponsePayload>;
    updateBlogCommentByIdAndDelete(updateBlogCommentDto: UpdateBlogCommentDto): Promise<ResponsePayload>;
    deleteBlogCommentById(id: string): Promise<ResponsePayload>;
    deleteBlogCommentByLoggedinUserAndBlogCommentId(id: string, user: User): Promise<ResponsePayload>;
}
