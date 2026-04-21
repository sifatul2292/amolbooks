import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../../shared/utils/utils.service';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { Category } from '../../../interfaces/common/category.interface';
import { AddCategoryDto, FilterAndPaginationCategoryDto, OptionCategoryDto, UpdateCategoryDto } from '../../../dto/category.dto';
import { Product } from '../../../interfaces/common/product.interface';
import { SubCategory } from '../../../interfaces/common/sub-category.interface';
export declare class CategoryService {
    private readonly categoryModel;
    private readonly productModel;
    private readonly subCategoryModel;
    private configService;
    private utilsService;
    private logger;
    constructor(categoryModel: Model<Category>, productModel: Model<Product>, subCategoryModel: Model<SubCategory>, configService: ConfigService, utilsService: UtilsService);
    addCategory(addCategoryDto: AddCategoryDto): Promise<ResponsePayload>;
    insertManyCategory(addCategorysDto: AddCategoryDto[], optionCategoryDto: OptionCategoryDto): Promise<ResponsePayload>;
    getAllCategories(filterCategoryDto: FilterAndPaginationCategoryDto, searchQuery?: string): Promise<ResponsePayload>;
    getCategoryById(id: string, select: string): Promise<ResponsePayload>;
    updateCategoryById(id: string, updateCategoryDto: UpdateCategoryDto): Promise<ResponsePayload>;
    updateMultipleCategoryById(ids: string[], updateCategoryDto: UpdateCategoryDto): Promise<ResponsePayload>;
    changeMultipleCategoryStatus(ids: string[], updateCategoryDto: UpdateCategoryDto): Promise<ResponsePayload>;
    deleteCategoryById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleCategoryById(ids: string[], checkUsage: boolean): Promise<ResponsePayload>;
}
