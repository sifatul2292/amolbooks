import { Model } from 'mongoose';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { Cache } from 'cache-manager';
import { AdditionalPage } from '../../interfaces/core/additional-page.interface';
import { AddAdditionalPageDto, UpdateAdditionalPageDto } from '../../dto/additional-page.dto';
export declare class AdditionalPageService {
    private readonly additionalPageModel;
    private cacheManager;
    private logger;
    private readonly cacheAllData;
    private readonly cacheDataCount;
    constructor(additionalPageModel: Model<AdditionalPage>, cacheManager: Cache);
    addAdditionalPage(addAdditionalPageDto: AddAdditionalPageDto): Promise<ResponsePayload>;
    getAdditionalPageBySlug(slug: string, select: string): Promise<ResponsePayload>;
    updateAdditionalPageBySlug(slug: string, updateAdditionalPageDto: UpdateAdditionalPageDto): Promise<ResponsePayload>;
    deleteAdditionalPageBySlug(slug: string, checkUsage: boolean): Promise<ResponsePayload>;
}
