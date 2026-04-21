import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../../shared/utils/utils.service';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { AddSubCategoryDto, FilterAndPaginationSubCategoryDto, OptionSubCategoryDto, UpdateSubCategoryDto } from '../../../dto/sub-category.dto';
import { SubCategory } from '../../../interfaces/common/sub-category.interface';
import { Product } from '../../../interfaces/common/product.interface';
import { UpdateCategoryDto } from '../../../dto/category.dto';
export declare class SubCategoryService {
    private readonly subCategoryModel;
    private readonly productModel;
    private configService;
    private utilsService;
    private logger;
    constructor(subCategoryModel: Model<SubCategory>, productModel: Model<Product>, configService: ConfigService, utilsService: UtilsService);
    addSubCategory(addSubCategoryDto: AddSubCategoryDto): Promise<ResponsePayload>;
    insertManySubCategory(addSubCategorysDto: AddSubCategoryDto[], optionSubCategoryDto: OptionSubCategoryDto): Promise<ResponsePayload>;
    getAllSubCategories(filterSubCategoryDto: FilterAndPaginationSubCategoryDto, searchQuery?: string): Promise<ResponsePayload>;
    getSubCategoryById(id: string, select: string): Promise<ResponsePayload>;
    getSubCategoriesByCategoryId(id: string, select: string): Promise<ResponsePayload>;
    getSubCategoriesGroupByCategory(): Promise<ResponsePayload>;
    updateSubCategoryById(id: string, updateSubCategoryDto: UpdateSubCategoryDto): Promise<ResponsePayload>;
    updateMultipleSubCategoryById(ids: string[], updateSubCategoryDto: UpdateSubCategoryDto): Promise<ResponsePayload>;
    changeMultipleSubCategoryStatus(ids: string[], updateCategoryDto: UpdateCategoryDto): Promise<ResponsePayload>;
    deleteSubCategoryById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleSubCategoryById(ids: string[], checkUsage: boolean): Promise<ResponsePayload>;
}
