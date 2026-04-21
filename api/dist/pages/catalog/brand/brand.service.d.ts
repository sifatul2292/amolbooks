import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../../shared/utils/utils.service';
import { Brand } from '../../../interfaces/common/brand.interface';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { AddBrandDto, FilterAndPaginationBrandDto, OptionBrandDto, UpdateBrandDto } from '../../../dto/brand.dto';
import { Product } from '../../../interfaces/common/product.interface';
export declare class BrandService {
    private readonly brandModel;
    private readonly productModel;
    private configService;
    private utilsService;
    private logger;
    constructor(brandModel: Model<Brand>, productModel: Model<Product>, configService: ConfigService, utilsService: UtilsService);
    addBrand(addBrandDto: AddBrandDto): Promise<ResponsePayload>;
    insertManyBrand(addBrandsDto: AddBrandDto[], optionBrandDto: OptionBrandDto): Promise<ResponsePayload>;
    getAllBrands(filterBrandDto: FilterAndPaginationBrandDto, searchQuery?: string): Promise<ResponsePayload>;
    getBrandById(id: string, select: string): Promise<ResponsePayload>;
    updateBrandById(id: string, updateBrandDto: UpdateBrandDto): Promise<ResponsePayload>;
    updateMultipleBrandById(ids: string[], updateBrandDto: UpdateBrandDto): Promise<ResponsePayload>;
    deleteBrandById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleBrandById(ids: string[], checkUsage: boolean): Promise<ResponsePayload>;
}
