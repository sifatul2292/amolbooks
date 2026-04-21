import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../../shared/utils/utils.service';
import { ShopInformation } from '../../../interfaces/common/shop-information.interface';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { AddShopInformationDto, FilterAndPaginationShopInformationDto, OptionShopInformationDto, UpdateShopInformationDto } from '../../../dto/shop-information.dto';
import { Product } from '../../../interfaces/common/product.interface';
export declare class ShopInformationService {
    private readonly shopInformationModel;
    private readonly productModel;
    private configService;
    private utilsService;
    private logger;
    constructor(shopInformationModel: Model<ShopInformation>, productModel: Model<Product>, configService: ConfigService, utilsService: UtilsService);
    addShopInformation(addShopInformationDto: AddShopInformationDto): Promise<ResponsePayload>;
    insertManyShopInformation(addShopInformationsDto: AddShopInformationDto[], optionShopInformationDto: OptionShopInformationDto): Promise<ResponsePayload>;
    getShopInformation(select: string): Promise<ResponsePayload>;
    getAllShopInformationsBasic(): Promise<ResponsePayload>;
    getAllShopInformations(filterShopInformationDto: FilterAndPaginationShopInformationDto, searchQuery?: string): Promise<ResponsePayload>;
    getShopInformationById(id: string, select: string): Promise<ResponsePayload>;
    updateShopInformationById(id: string, updateShopInformationDto: UpdateShopInformationDto): Promise<ResponsePayload>;
    updateMultipleShopInformationById(ids: string[], updateShopInformationDto: UpdateShopInformationDto): Promise<ResponsePayload>;
    deleteShopInformationById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleShopInformationById(ids: string[], checkUsage: boolean): Promise<ResponsePayload>;
}
