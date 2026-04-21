import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../../shared/utils/utils.service';
import { Tag } from '../../../interfaces/common/tag.interface';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { AddTagDto, FilterAndPaginationTagDto, OptionTagDto, UpdateTagDto } from '../../../dto/tag.dto';
import { Product } from '../../../interfaces/common/product.interface';
export declare class TagService {
    private readonly tagModel;
    private readonly productModel;
    private configService;
    private utilsService;
    private logger;
    constructor(tagModel: Model<Tag>, productModel: Model<Product>, configService: ConfigService, utilsService: UtilsService);
    getAllTagForUi(): Promise<ResponsePayload>;
    addTag(addTagDto: AddTagDto): Promise<ResponsePayload>;
    insertManyTag(addTagsDto: AddTagDto[], optionTagDto: OptionTagDto): Promise<ResponsePayload>;
    getAllTagsBasic(): Promise<ResponsePayload>;
    getAllTags(filterTagDto: FilterAndPaginationTagDto, searchQuery?: string): Promise<ResponsePayload>;
    getTagById(id: string, select: string): Promise<ResponsePayload>;
    updateTagById(id: string, updateTagDto: UpdateTagDto): Promise<ResponsePayload>;
    updateMultipleTagById(ids: string[], updateTagDto: UpdateTagDto): Promise<ResponsePayload>;
    deleteTagById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleTagById(ids: string[], checkUsage: boolean): Promise<ResponsePayload>;
}
