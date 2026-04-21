import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../../shared/utils/utils.service';
import { StoreInfo } from '../../../interfaces/common/store-info.interface';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { AddStoreInfoDto, FilterAndPaginationStoreInfoDto, OptionStoreInfoDto, UpdateStoreInfoDto } from '../../../dto/store-info.dto';
export declare class StoreInfoService {
    private readonly storeInfoModel;
    private configService;
    private utilsService;
    private logger;
    constructor(storeInfoModel: Model<StoreInfo>, configService: ConfigService, utilsService: UtilsService);
    addStoreInfo(addStoreInfoDto: AddStoreInfoDto): Promise<ResponsePayload>;
    insertManyStoreInfo(addStoreInfosDto: AddStoreInfoDto[], optionStoreInfoDto: OptionStoreInfoDto): Promise<ResponsePayload>;
    getAllStoreInfosBasic(): Promise<ResponsePayload>;
    getAllStoreInfos(filterStoreInfoDto: FilterAndPaginationStoreInfoDto, searchQuery?: string): Promise<ResponsePayload>;
    getStoreInfoById(id: string, select: string): Promise<ResponsePayload>;
    updateStoreInfoById(id: string, updateStoreInfoDto: UpdateStoreInfoDto): Promise<ResponsePayload>;
    updateMultipleStoreInfoById(ids: string[], updateStoreInfoDto: UpdateStoreInfoDto): Promise<ResponsePayload>;
    deleteStoreInfoById(id: string): Promise<ResponsePayload>;
    deleteMultipleStoreInfoById(ids: string[]): Promise<ResponsePayload>;
}
