import { AddCategoryDto, FilterAndPaginationCategoryDto, OptionCategoryDto, UpdateCategoryDto } from '../../../dto/category.dto';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { CategoryService } from './category.service';
export declare class CategoryController {
    private categoryService;
    private logger;
    constructor(categoryService: CategoryService);
    addCategory(addCategoryDto: AddCategoryDto): Promise<ResponsePayload>;
    insertManyCategory(body: {
        data: AddCategoryDto[];
        option: OptionCategoryDto;
    }): Promise<ResponsePayload>;
    getAllCategories(filterCategoryDto: FilterAndPaginationCategoryDto, searchString: string): Promise<ResponsePayload>;
    getCategoryById(id: string, select: string): Promise<ResponsePayload>;
    updateCategoryById(id: string, updateCategoryDto: UpdateCategoryDto): Promise<ResponsePayload>;
    updateMultipleCategoryById(updateCategoryDto: UpdateCategoryDto): Promise<ResponsePayload>;
    changeMultipleCategoryStatus(updateCategoryDto: UpdateCategoryDto): Promise<ResponsePayload>;
    deleteCategoryById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleCategoryById(data: {
        ids: string[];
    }, checkUsage: boolean): Promise<ResponsePayload>;
}
