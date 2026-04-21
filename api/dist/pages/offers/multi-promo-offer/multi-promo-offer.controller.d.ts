import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { MultiPromoOfferService } from './multi-promo-offer.service';
import { AddMultiPromoOfferDto, FilterAndPaginationMultiPromoOfferDto, OptionMultiPromoOfferDto, UpdateMultiPromoOfferDto } from '../../../dto/multi-promo-offer.dto';
export declare class MultiPromoOfferController {
    private multiPromoOfferService;
    private logger;
    constructor(multiPromoOfferService: MultiPromoOfferService);
    addMultiPromoOffer(addMultiPromoOfferDto: AddMultiPromoOfferDto): Promise<ResponsePayload>;
    insertManyMultiPromoOffer(body: {
        data: AddMultiPromoOfferDto[];
        option: OptionMultiPromoOfferDto;
    }): Promise<ResponsePayload>;
    getAllMultiPromoOffers(filterMultiPromoOfferDto: FilterAndPaginationMultiPromoOfferDto, searchString: string): Promise<ResponsePayload>;
    getMultiPromoOfferSingle(select: string): Promise<ResponsePayload>;
    getMultiPromoOfferById(id: string, select: string): Promise<ResponsePayload>;
    updateMultiPromoOfferById(id: string, updateMultiPromoOfferDto: UpdateMultiPromoOfferDto): Promise<ResponsePayload>;
    updateMultipleMultiPromoOfferById(updateMultiPromoOfferDto: UpdateMultiPromoOfferDto): Promise<ResponsePayload>;
    deleteMultiPromoOfferById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleMultiPromoOfferById(data: {
        ids: string[];
    }, checkUsage: boolean): Promise<ResponsePayload>;
}
