import { AddAuthorDto, CheckAuthorDto, FilterAndPaginationAuthorDto, OptionAuthorDto, UpdateAuthorDto } from '../../../dto/author.dto';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { AuthorService } from './author.service';
import { User } from '../../../interfaces/user/user.interface';
export declare class AuthorController {
    private authorService;
    private logger;
    constructor(authorService: AuthorService);
    addAuthor(addAuthorDto: AddAuthorDto): Promise<ResponsePayload>;
    insertManyAuthor(body: {
        data: AddAuthorDto[];
        option: OptionAuthorDto;
    }): Promise<ResponsePayload>;
    getAllAuthors(filterAuthorDto: FilterAndPaginationAuthorDto, searchString: string): Promise<ResponsePayload>;
    getAllAuthorsBasic(): Promise<ResponsePayload>;
    getAuthorBySlug(slug: string, select: string): Promise<ResponsePayload>;
    getAuthorById(id: string, select: string): Promise<ResponsePayload>;
    updateAuthorById(id: string, updateAuthorDto: UpdateAuthorDto): Promise<ResponsePayload>;
    updateMultipleAuthorById(updateAuthorDto: UpdateAuthorDto): Promise<ResponsePayload>;
    deleteAuthorById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleAuthorById(data: {
        ids: string[];
    }, checkUsage: boolean): Promise<ResponsePayload>;
    checkAuthorAvailability(user: User, checkAuthorDto: CheckAuthorDto): Promise<ResponsePayload>;
}
