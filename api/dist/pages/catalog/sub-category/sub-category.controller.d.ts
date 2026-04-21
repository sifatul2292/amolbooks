import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { AddSubCategoryDto, FilterAndPaginationSubCategoryDto, OptionSubCategoryDto, UpdateSubCategoryDto } from '../../../dto/sub-category.dto';
import { SubCategoryService } from './sub-category.service';
import { UpdateCategoryDto } from '../../../dto/category.dto';
export declare class SubCategoryController {
    private subCategoryService;
    private logger;
    constructor(subCategoryService: SubCategoryService);
    addSubCategory(addSubCategoryDto: AddSubCategoryDto): Promise<ResponsePayload>;
    insertManySubCategory(body: {
        data: AddSubCategoryDto[];
        option: OptionSubCategoryDto;
    }): Promise<ResponsePayload>;
    getAllSubCategories(filterSubCategoryDto: FilterAndPaginationSubCategoryDto, searchString: string): Promise<ResponsePayload>;
    getSubCategoriesGroupByCategory(): Promise<ResponsePayload>;
    getSubCategoryById(id: string, select: string): Promise<ResponsePayload>;
    getSubCategoriesByCategoryId(id: string, select: string): Promise<ResponsePayload>;
    updateSubCategoryById(id: string, updateSubCategoryDto: UpdateSubCategoryDto): Promise<ResponsePayload>;
    updateMultipleSubCategoryById(updateSubCategoryDto: UpdateSubCategoryDto): Promise<ResponsePayload>;
    changeMultipleSubCategoryStatus(updateCategoryDto: UpdateCategoryDto): Promise<ResponsePayload>;
    deleteSubCategoryById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleSubCategoryById(data: {
        ids: string[];
    }, checkUsage: boolean): Promise<ResponsePayload>;
}
