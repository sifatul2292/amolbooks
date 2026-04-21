import { Model } from 'mongoose';
import { Newsletter } from '../../../interfaces/common/newsletter.interface';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { AddNewsletterDto, FilterAndPaginationNewsletterDto, OptionNewsletterDto, UpdateNewsletterDto } from '../../../dto/newsletter.dto';
export declare class NewsletterService {
    private readonly newsletterModel;
    private logger;
    constructor(newsletterModel: Model<Newsletter>);
    addNewsletter(addNewsletterDto: AddNewsletterDto): Promise<ResponsePayload>;
    insertManyNewsletter(addNewslettersDto: AddNewsletterDto[], optionNewsletterDto: OptionNewsletterDto): Promise<ResponsePayload>;
    getAllNewslettersBasic(): Promise<ResponsePayload>;
    getAllNewsletters(filterNewsletterDto: FilterAndPaginationNewsletterDto, searchQuery?: string): Promise<ResponsePayload>;
    getNewsletterById(id: string, select: string): Promise<ResponsePayload>;
    updateNewsletterById(id: string, updateNewsletterDto: UpdateNewsletterDto): Promise<ResponsePayload>;
    updateMultipleNewsletterById(ids: string[], updateNewsletterDto: UpdateNewsletterDto): Promise<ResponsePayload>;
    deleteNewsletterById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleNewsletterById(ids: string[], checkUsage: boolean): Promise<ResponsePayload>;
}
