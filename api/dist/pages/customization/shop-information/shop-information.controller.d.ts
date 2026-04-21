import { AddShopInformationDto, FilterAndPaginationShopInformationDto, OptionShopInformationDto, UpdateShopInformationDto } from '../../../dto/shop-information.dto';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { ShopInformationService } from './shop-information.service';
export declare class ShopInformationController {
    private shopInformationService;
    private logger;
    constructor(shopInformationService: ShopInformationService);
    addShopInformation(addShopInformationDto: AddShopInformationDto): Promise<ResponsePayload>;
    insertManyShopInformation(body: {
        data: AddShopInformationDto[];
        option: OptionShopInformationDto;
    }): Promise<ResponsePayload>;
    getShopInformation(select: string): Promise<ResponsePayload>;
    getAllShopInformations(filterShopInformationDto: FilterAndPaginationShopInformationDto, searchString: string): Promise<ResponsePayload>;
    getAllShopInformationsBasic(): Promise<ResponsePayload>;
    getShopInformationById(id: string, select: string): Promise<ResponsePayload>;
    updateShopInformationById(id: string, updateShopInformationDto: UpdateShopInformationDto): Promise<ResponsePayload>;
    updateMultipleShopInformationById(updateShopInformationDto: UpdateShopInformationDto): Promise<ResponsePayload>;
    deleteShopInformationById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleShopInformationById(data: {
        ids: string[];
    }, checkUsage: boolean): Promise<ResponsePayload>;
}
