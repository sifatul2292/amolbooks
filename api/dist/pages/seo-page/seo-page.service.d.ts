import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../shared/utils/utils.service';
import { SeoPage } from '../../interfaces/common/seo-page.interface';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { AddSeoPageDto, FilterAndPaginationSeoPageDto, OptionSeoPageDto, UpdateSeoPageDto } from '../../dto/seo-page.dto';
import { Product } from '../../interfaces/common/product.interface';
export declare class SeoPageService {
    private readonly seoPageModel;
    private readonly productModel;
    private configService;
    private utilsService;
    private logger;
    constructor(seoPageModel: Model<SeoPage>, productModel: Model<Product>, configService: ConfigService, utilsService: UtilsService);
    addSeoPage(addSeoPageDto: AddSeoPageDto): Promise<ResponsePayload>;
    insertManySeoPage(addSeoPagesDto: AddSeoPageDto[], optionSeoPageDto: OptionSeoPageDto): Promise<ResponsePayload>;
    getAllSeoPages(filterSeoPageDto: FilterAndPaginationSeoPageDto, searchQuery?: string): Promise<ResponsePayload>;
    getSeoPageById(id: string, select: string): Promise<ResponsePayload>;
    getSeoPageByPage(pageName: string, select: string): Promise<ResponsePayload>;
    updateSeoPageById(id: string, updateSeoPageDto: UpdateSeoPageDto): Promise<ResponsePayload>;
    updateMultipleSeoPageById(ids: string[], updateSeoPageDto: UpdateSeoPageDto): Promise<ResponsePayload>;
    deleteSeoPageById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleSeoPageById(ids: string[], checkUsage: boolean): Promise<ResponsePayload>;
}
