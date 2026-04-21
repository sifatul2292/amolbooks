import { AddBrandDto, FilterAndPaginationBrandDto, OptionBrandDto, UpdateBrandDto } from '../../../dto/brand.dto';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { BrandService } from './brand.service';
export declare class BrandController {
    private brandService;
    private logger;
    constructor(brandService: BrandService);
    addBrand(addBrandDto: AddBrandDto): Promise<ResponsePayload>;
    insertManyBrand(body: {
        data: AddBrandDto[];
        option: OptionBrandDto;
    }): Promise<ResponsePayload>;
    getAllBrands(filterBrandDto: FilterAndPaginationBrandDto, searchString: string): Promise<ResponsePayload>;
    getBrandById(id: string, select: string): Promise<ResponsePayload>;
    updateBrandById(id: string, updateBrandDto: UpdateBrandDto): Promise<ResponsePayload>;
    updateMultipleBrandById(updateBrandDto: UpdateBrandDto): Promise<ResponsePayload>;
    deleteBrandById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleBrandById(data: {
        ids: string[];
    }, checkUsage: boolean): Promise<ResponsePayload>;
}
