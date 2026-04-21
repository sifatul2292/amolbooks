import { AddNewsletterDto, FilterAndPaginationNewsletterDto, OptionNewsletterDto, UpdateNewsletterDto } from '../../../dto/newsletter.dto';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { NewsletterService } from './newsletter.service';
export declare class NewsletterController {
    private newsletterService;
    private logger;
    constructor(newsletterService: NewsletterService);
    addNewsletter(addNewsletterDto: AddNewsletterDto): Promise<ResponsePayload>;
    insertManyNewsletter(body: {
        data: AddNewsletterDto[];
        option: OptionNewsletterDto;
    }): Promise<ResponsePayload>;
    getAllNewsletters(filterNewsletterDto: FilterAndPaginationNewsletterDto, searchString: string): Promise<ResponsePayload>;
    getAllNewslettersBasic(): Promise<ResponsePayload>;
    getNewsletterById(id: string, select: string): Promise<ResponsePayload>;
    updateNewsletterById(id: string, updateNewsletterDto: UpdateNewsletterDto): Promise<ResponsePayload>;
    updateMultipleNewsletterById(updateNewsletterDto: UpdateNewsletterDto): Promise<ResponsePayload>;
    deleteNewsletterById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleNewsletterById(data: {
        ids: string[];
    }, checkUsage: boolean): Promise<ResponsePayload>;
}
