import { AddBlogDto, CheckBlogDto, FilterAndPaginationBlogDto, OptionBlogDto, UpdateBlogDto } from '../../../dto/blog.dto';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { BlogService } from './blog.service';
import { User } from '../../../interfaces/user/user.interface';
export declare class BlogController {
    private blogService;
    private logger;
    constructor(blogService: BlogService);
    addBlog(addBlogDto: AddBlogDto): Promise<ResponsePayload>;
    insertManyBlog(body: {
        data: AddBlogDto[];
        option: OptionBlogDto;
    }): Promise<ResponsePayload>;
    getAllBlogs(filterBlogDto: FilterAndPaginationBlogDto, searchString: string): Promise<ResponsePayload>;
    getAllBlogsBasic(): Promise<ResponsePayload>;
    productViewCount(data: {
        id: string;
        user: string;
    }): Promise<ResponsePayload>;
    getBlogById(id: string, select: string): Promise<ResponsePayload>;
    updateBlogById(id: string, updateBlogDto: UpdateBlogDto): Promise<ResponsePayload>;
    updateMultipleBlogById(updateBlogDto: UpdateBlogDto): Promise<ResponsePayload>;
    deleteBlogById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleBlogById(data: {
        ids: string[];
    }, checkUsage: boolean): Promise<ResponsePayload>;
    checkBlogAvailability(user: User, checkBlogDto: CheckBlogDto): Promise<ResponsePayload>;
}
