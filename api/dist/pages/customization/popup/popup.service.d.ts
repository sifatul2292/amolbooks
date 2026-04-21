import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../../shared/utils/utils.service';
import { Popup } from '../../../interfaces/common/popup.interface';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { AddPopupDto, FilterAndPaginationPopupDto, OptionPopupDto, UpdatePopupDto } from '../../../dto/popup.dto';
import { Product } from '../../../interfaces/common/product.interface';
export declare class PopupService {
    private readonly popupModel;
    private readonly productModel;
    private configService;
    private utilsService;
    private logger;
    constructor(popupModel: Model<Popup>, productModel: Model<Product>, configService: ConfigService, utilsService: UtilsService);
    addPopup(addPopupDto: AddPopupDto): Promise<ResponsePayload>;
    insertManyPopup(addPopupsDto: AddPopupDto[], optionPopupDto: OptionPopupDto): Promise<ResponsePayload>;
    getAllPopups(filterPopupDto: FilterAndPaginationPopupDto, searchQuery?: string): Promise<ResponsePayload>;
    getPopupById(id: string, select: string): Promise<ResponsePayload>;
    updatePopupById(id: string, updatePopupDto: UpdatePopupDto): Promise<ResponsePayload>;
    updateMultiplePopupById(ids: string[], updatePopupDto: UpdatePopupDto): Promise<ResponsePayload>;
    deletePopupById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultiplePopupById(ids: string[], checkUsage: boolean): Promise<ResponsePayload>;
}
