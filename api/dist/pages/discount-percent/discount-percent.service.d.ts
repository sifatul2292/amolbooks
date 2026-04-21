import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../shared/utils/utils.service';
import { DiscountPercent } from '../../interfaces/common/discount-percent.interface';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { AddDiscountPercentDto, FilterAndPaginationDiscountPercentDto, OptionDiscountPercentDto, UpdateDiscountPercentDto } from '../../dto/discount-percent.dto';
import { Product } from '../../interfaces/common/product.interface';
export declare class DiscountPercentService {
    private readonly discountPercentModel;
    private readonly productModel;
    private configService;
    private utilsService;
    private logger;
    constructor(discountPercentModel: Model<DiscountPercent>, productModel: Model<Product>, configService: ConfigService, utilsService: UtilsService);
    addDiscountPercent(addDiscountPercentDto: AddDiscountPercentDto): Promise<ResponsePayload>;
    insertManyDiscountPercent(addDiscountPercentsDto: AddDiscountPercentDto[], optionDiscountPercentDto: OptionDiscountPercentDto): Promise<ResponsePayload>;
    getAllDiscountPercents(filterDiscountPercentDto: FilterAndPaginationDiscountPercentDto, searchQuery?: string): Promise<ResponsePayload>;
    getDiscountPercentById(id: string, select: string): Promise<ResponsePayload>;
    updateDiscountPercentById(id: string, updateDiscountPercentDto: UpdateDiscountPercentDto): Promise<ResponsePayload>;
    updateMultipleDiscountPercentById(ids: string[], updateDiscountPercentDto: UpdateDiscountPercentDto): Promise<ResponsePayload>;
    deleteDiscountPercentById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleDiscountPercentById(ids: string[], checkUsage: boolean): Promise<ResponsePayload>;
}
