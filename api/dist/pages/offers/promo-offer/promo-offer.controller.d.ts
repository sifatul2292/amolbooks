import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { PromoOfferService } from './promo-offer.service';
import { AddPromoOfferDto, FilterAndPaginationPromoOfferDto, OptionPromoOfferDto, UpdatePromoOfferDto } from '../../../dto/promo-offer.dto';
export declare class PromoOfferController {
    private promoOfferService;
    private logger;
    constructor(promoOfferService: PromoOfferService);
    addPromoOffer(addPromoOfferDto: AddPromoOfferDto): Promise<ResponsePayload>;
    insertManyPromoOffer(body: {
        data: AddPromoOfferDto[];
        option: OptionPromoOfferDto;
    }): Promise<ResponsePayload>;
    getAllPromoOffers(filterPromoOfferDto: FilterAndPaginationPromoOfferDto, searchString: string): Promise<ResponsePayload>;
    getPromoOfferSingle(select: string): Promise<ResponsePayload>;
    getPromoOfferById(id: string, select: string): Promise<ResponsePayload>;
    updatePromoOfferById(id: string, updatePromoOfferDto: UpdatePromoOfferDto): Promise<ResponsePayload>;
    updateMultiplePromoOfferById(updatePromoOfferDto: UpdatePromoOfferDto): Promise<ResponsePayload>;
    deletePromoOfferById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultiplePromoOfferById(data: {
        ids: string[];
    }, checkUsage: boolean): Promise<ResponsePayload>;
}
