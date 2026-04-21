import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../../shared/utils/utils.service';
import { Activities } from '../../../interfaces/common/activities.interface';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { AddActivitiesDto, CheckActivitiesDto, FilterAndPaginationActivitiesDto, OptionActivitiesDto, UpdateActivitiesDto } from '../../../dto/activities.dto';
import { User } from '../../../interfaces/user/user.interface';
export declare class ActivitiesService {
    private readonly activitiesModel;
    private readonly userModel;
    private configService;
    private utilsService;
    private logger;
    constructor(activitiesModel: Model<Activities>, userModel: Model<User>, configService: ConfigService, utilsService: UtilsService);
    addActivities(addActivitiesDto: AddActivitiesDto): Promise<ResponsePayload>;
    insertManyActivities(addActivitiessDto: AddActivitiesDto[], optionActivitiesDto: OptionActivitiesDto): Promise<ResponsePayload>;
    getAllActivitiessBasic(): Promise<ResponsePayload>;
    getAllActivitiess(filterActivitiesDto: FilterAndPaginationActivitiesDto, searchQuery?: string): Promise<ResponsePayload>;
    getActivitiesById(id: string, select: string): Promise<ResponsePayload>;
    activitiesViewCount(id: string, user?: string): Promise<ResponsePayload>;
    updateActivitiesById(id: string, updateActivitiesDto: UpdateActivitiesDto): Promise<ResponsePayload>;
    updateMultipleActivitiesById(ids: string[], updateActivitiesDto: UpdateActivitiesDto): Promise<ResponsePayload>;
    deleteActivitiesById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleActivitiesById(ids: string[], checkUsage: boolean): Promise<ResponsePayload>;
    checkActivitiesAvailability(user: User, checkActivitiesDto: CheckActivitiesDto): Promise<ResponsePayload>;
}
