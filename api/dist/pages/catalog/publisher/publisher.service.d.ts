import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../../shared/utils/utils.service';
import { Publisher } from '../../../interfaces/common/publisher.interface';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { AddPublisherDto, CheckPublisherDto, FilterAndPaginationPublisherDto, OptionPublisherDto, UpdatePublisherDto } from '../../../dto/publisher.dto';
import { User } from '../../../interfaces/user/user.interface';
export declare class PublisherService {
    private readonly publisherModel;
    private readonly userModel;
    private configService;
    private utilsService;
    private logger;
    constructor(publisherModel: Model<Publisher>, userModel: Model<User>, configService: ConfigService, utilsService: UtilsService);
    addPublisher(addPublisherDto: AddPublisherDto): Promise<ResponsePayload>;
    insertManyPublisher(addPublishersDto: AddPublisherDto[], optionPublisherDto: OptionPublisherDto): Promise<ResponsePayload>;
    getAllPublishersBasic(): Promise<ResponsePayload>;
    getAllPublishers(filterPublisherDto: FilterAndPaginationPublisherDto, searchQuery?: string): Promise<ResponsePayload>;
    getPublisherById(id: string, select: string): Promise<ResponsePayload>;
    updatePublisherById(id: string, updatePublisherDto: UpdatePublisherDto): Promise<ResponsePayload>;
    updateMultiplePublisherById(ids: string[], updatePublisherDto: UpdatePublisherDto): Promise<ResponsePayload>;
    deletePublisherById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultiplePublisherById(ids: string[], checkUsage: boolean): Promise<ResponsePayload>;
    checkPublisherAvailability(user: User, checkPublisherDto: CheckPublisherDto): Promise<ResponsePayload>;
}
