import { AddStoreInfoDto, FilterAndPaginationStoreInfoDto, OptionStoreInfoDto, UpdateStoreInfoDto } from '../../../dto/store-info.dto';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { StoreInfoService } from './store-info.service';
export declare class StoreInfoController {
    private storeInfoService;
    private logger;
    constructor(storeInfoService: StoreInfoService);
    addStoreInfo(addStoreInfoDto: AddStoreInfoDto): Promise<ResponsePayload>;
    insertManyStoreInfo(body: {
        data: AddStoreInfoDto[];
        option: OptionStoreInfoDto;
    }): Promise<ResponsePayload>;
    getAllStoreInfos(filterStoreInfoDto: FilterAndPaginationStoreInfoDto, searchString: string): Promise<ResponsePayload>;
    getAllStoreInfosBasic(): Promise<ResponsePayload>;
    getStoreInfoById(id: string, select: string): Promise<ResponsePayload>;
    updateStoreInfoById(id: string, updateStoreInfoDto: UpdateStoreInfoDto): Promise<ResponsePayload>;
    updateMultipleStoreInfoById(updateStoreInfoDto: UpdateStoreInfoDto): Promise<ResponsePayload>;
    deleteStoreInfoById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleStoreInfoById(data: {
        ids: string[];
    }, checkUsage: boolean): Promise<ResponsePayload>;
}
