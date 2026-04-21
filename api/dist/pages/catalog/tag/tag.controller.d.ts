import { AddTagDto, FilterAndPaginationTagDto, OptionTagDto, UpdateTagDto } from '../../../dto/tag.dto';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { TagService } from './tag.service';
export declare class TagController {
    private tagService;
    private logger;
    constructor(tagService: TagService);
    getAllTagForUi(): Promise<ResponsePayload>;
    addTag(addTagDto: AddTagDto): Promise<ResponsePayload>;
    insertManyTag(body: {
        data: AddTagDto[];
        option: OptionTagDto;
    }): Promise<ResponsePayload>;
    getAllTags(filterTagDto: FilterAndPaginationTagDto, searchString: string): Promise<ResponsePayload>;
    getAllTagsBasic(): Promise<ResponsePayload>;
    getTagById(id: string, select: string): Promise<ResponsePayload>;
    updateTagById(id: string, updateTagDto: UpdateTagDto): Promise<ResponsePayload>;
    updateMultipleTagById(updateTagDto: UpdateTagDto): Promise<ResponsePayload>;
    deleteTagById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleTagById(data: {
        ids: string[];
    }, checkUsage: boolean): Promise<ResponsePayload>;
}
