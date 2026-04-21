import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../../shared/utils/utils.service';
import { Blog } from '../../../interfaces/common/blog.interface';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { AddBlogDto, CheckBlogDto, FilterAndPaginationBlogDto, OptionBlogDto, UpdateBlogDto } from '../../../dto/blog.dto';
import { User } from '../../../interfaces/user/user.interface';
export declare class BlogService {
    private readonly blogModel;
    private readonly userModel;
    private configService;
    private utilsService;
    private logger;
    constructor(blogModel: Model<Blog>, userModel: Model<User>, configService: ConfigService, utilsService: UtilsService);
    addBlog(addBlogDto: AddBlogDto): Promise<ResponsePayload>;
    insertManyBlog(addBlogsDto: AddBlogDto[], optionBlogDto: OptionBlogDto): Promise<ResponsePayload>;
    getAllBlogsBasic(): Promise<ResponsePayload>;
    getAllBlogs(filterBlogDto: FilterAndPaginationBlogDto, searchQuery?: string): Promise<ResponsePayload>;
    getBlogById(id: string, select: string): Promise<ResponsePayload>;
    blogViewCount(id: string, user?: string): Promise<ResponsePayload>;
    updateBlogById(id: string, updateBlogDto: UpdateBlogDto): Promise<ResponsePayload>;
    updateMultipleBlogById(ids: string[], updateBlogDto: UpdateBlogDto): Promise<ResponsePayload>;
    deleteBlogById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleBlogById(ids: string[], checkUsage: boolean): Promise<ResponsePayload>;
    checkBlogAvailability(user: User, checkBlogDto: CheckBlogDto): Promise<ResponsePayload>;
    findAllPublished(): Promise<Blog[]>;
}
