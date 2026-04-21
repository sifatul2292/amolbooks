import { AddPublisherDto, CheckPublisherDto, FilterAndPaginationPublisherDto, OptionPublisherDto, UpdatePublisherDto } from '../../../dto/publisher.dto';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { PublisherService } from './publisher.service';
import { User } from '../../../interfaces/user/user.interface';
export declare class PublisherController {
    private publisherService;
    private logger;
    constructor(publisherService: PublisherService);
    addPublisher(addPublisherDto: AddPublisherDto): Promise<ResponsePayload>;
    insertManyPublisher(body: {
        data: AddPublisherDto[];
        option: OptionPublisherDto;
    }): Promise<ResponsePayload>;
    getAllPublishers(filterPublisherDto: FilterAndPaginationPublisherDto, searchString: string): Promise<ResponsePayload>;
    getAllPublishersBasic(): Promise<ResponsePayload>;
    getPublisherById(id: string, select: string): Promise<ResponsePayload>;
    updatePublisherById(id: string, updatePublisherDto: UpdatePublisherDto): Promise<ResponsePayload>;
    updateMultiplePublisherById(updatePublisherDto: UpdatePublisherDto): Promise<ResponsePayload>;
    deletePublisherById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultiplePublisherById(data: {
        ids: string[];
    }, checkUsage: boolean): Promise<ResponsePayload>;
    checkPublisherAvailability(user: User, checkPublisherDto: CheckPublisherDto): Promise<ResponsePayload>;
}
