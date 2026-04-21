import { AddPopupDto, FilterAndPaginationPopupDto, OptionPopupDto, UpdatePopupDto } from '../../../dto/popup.dto';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { PopupService } from './popup.service';
export declare class PopupController {
    private popupService;
    private logger;
    constructor(popupService: PopupService);
    addPopup(addPopupDto: AddPopupDto): Promise<ResponsePayload>;
    insertManyPopup(body: {
        data: AddPopupDto[];
        option: OptionPopupDto;
    }): Promise<ResponsePayload>;
    getAllPopups(filterPopupDto: FilterAndPaginationPopupDto, searchString: string): Promise<ResponsePayload>;
    getPopupById(id: string, select: string): Promise<ResponsePayload>;
    updatePopupById(id: string, updatePopupDto: UpdatePopupDto): Promise<ResponsePayload>;
    updateMultiplePopupById(updatePopupDto: UpdatePopupDto): Promise<ResponsePayload>;
    deletePopupById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultiplePopupById(data: {
        ids: string[];
    }, checkUsage: boolean): Promise<ResponsePayload>;
}
