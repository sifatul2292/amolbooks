import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../../shared/utils/utils.service';
import { Author } from '../../../interfaces/common/author.interface';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { AddAuthorDto, CheckAuthorDto, FilterAndPaginationAuthorDto, OptionAuthorDto, UpdateAuthorDto } from '../../../dto/author.dto';
import { User } from '../../../interfaces/user/user.interface';
export declare class AuthorService {
    private readonly authorModel;
    private readonly userModel;
    private configService;
    private utilsService;
    private logger;
    constructor(authorModel: Model<Author>, userModel: Model<User>, configService: ConfigService, utilsService: UtilsService);
    addAuthor(addAuthorDto: AddAuthorDto): Promise<ResponsePayload>;
    insertManyAuthor(addAuthorsDto: AddAuthorDto[], optionAuthorDto: OptionAuthorDto): Promise<ResponsePayload>;
    getAllAuthorsBasic(): Promise<ResponsePayload>;
    getAllAuthors(filterAuthorDto: FilterAndPaginationAuthorDto, searchQuery?: string): Promise<ResponsePayload>;
    getAuthorById(id: string, select: string): Promise<ResponsePayload>;
    getAuthorBySlug(slug: string, select: string): Promise<ResponsePayload>;
    updateAuthorById(id: string, updateAuthorDto: UpdateAuthorDto): Promise<ResponsePayload>;
    updateMultipleAuthorById(ids: string[], updateAuthorDto: UpdateAuthorDto): Promise<ResponsePayload>;
    deleteAuthorById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleAuthorById(ids: string[], checkUsage: boolean): Promise<ResponsePayload>;
    checkAuthorAvailability(user: User, checkAuthorDto: CheckAuthorDto): Promise<ResponsePayload>;
}
