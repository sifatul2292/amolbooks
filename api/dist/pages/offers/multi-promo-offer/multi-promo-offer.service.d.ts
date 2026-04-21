import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../../shared/utils/utils.service';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { MultiPromoOffer } from '../../../interfaces/common/multi-promo-offer.interface';
import { AddMultiPromoOfferDto, FilterAndPaginationMultiPromoOfferDto, OptionMultiPromoOfferDto, UpdateMultiPromoOfferDto } from '../../../dto/multi-promo-offer.dto';
import { JobSchedulerService } from '../../../shared/job-scheduler/job-scheduler.service';
export declare class MultiPromoOfferService {
    private readonly multiMultiPromoOfferModel;
    private configService;
    private utilsService;
    private jobSchedulerService;
    private logger;
    constructor(multiMultiPromoOfferModel: Model<MultiPromoOffer>, configService: ConfigService, utilsService: UtilsService, jobSchedulerService: JobSchedulerService);
    addMultiPromoOffer(addMultiPromoOfferDto: AddMultiPromoOfferDto): Promise<ResponsePayload>;
    insertManyMultiPromoOffer(addMultiPromoOffersDto: AddMultiPromoOfferDto[], optionMultiPromoOfferDto: OptionMultiPromoOfferDto): Promise<ResponsePayload>;
    getAllMultiPromoOffers(filterPromoOfferDto: FilterAndPaginationMultiPromoOfferDto, searchQuery?: string): Promise<ResponsePayload>;
    getMultiPromoOfferById(id: string, select: string): Promise<ResponsePayload>;
    getMultiPromoOfferDouble(select?: string): Promise<ResponsePayload>;
    updateMultiPromoOfferById(id: string, updateMultiPromoOfferDto: UpdateMultiPromoOfferDto): Promise<ResponsePayload>;
    updateMultipleMultiPromoOfferById(ids: string[], updateMultiPromoOfferDto: UpdateMultiPromoOfferDto): Promise<ResponsePayload>;
    deleteMultiPromoOfferById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleMultiPromoOfferById(ids: string[], checkUsage: boolean): Promise<ResponsePayload>;
}
