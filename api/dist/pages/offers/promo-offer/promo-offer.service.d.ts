import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../../shared/utils/utils.service';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { PromoOffer } from '../../../interfaces/common/promo-offer.interface';
import { AddPromoOfferDto, FilterAndPaginationPromoOfferDto, OptionPromoOfferDto, UpdatePromoOfferDto } from '../../../dto/promo-offer.dto';
import { JobSchedulerService } from '../../../shared/job-scheduler/job-scheduler.service';
export declare class PromoOfferService {
    private readonly promoOfferModel;
    private configService;
    private utilsService;
    private jobSchedulerService;
    private logger;
    constructor(promoOfferModel: Model<PromoOffer>, configService: ConfigService, utilsService: UtilsService, jobSchedulerService: JobSchedulerService);
    addPromoOffer(addPromoOfferDto: AddPromoOfferDto): Promise<ResponsePayload>;
    insertManyPromoOffer(addPromoOffersDto: AddPromoOfferDto[], optionPromoOfferDto: OptionPromoOfferDto): Promise<ResponsePayload>;
    getAllPromoOffers(filterPromoOfferDto: FilterAndPaginationPromoOfferDto, searchQuery?: string): Promise<ResponsePayload>;
    getPromoOfferById(id: string, select: string): Promise<ResponsePayload>;
    getPromoOfferSingle(select?: string): Promise<ResponsePayload>;
    updatePromoOfferById(id: string, updatePromoOfferDto: UpdatePromoOfferDto): Promise<ResponsePayload>;
    updateMultiplePromoOfferById(ids: string[], updatePromoOfferDto: UpdatePromoOfferDto): Promise<ResponsePayload>;
    deletePromoOfferById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultiplePromoOfferById(ids: string[], checkUsage: boolean): Promise<ResponsePayload>;
}
