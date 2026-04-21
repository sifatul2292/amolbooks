import { AddActivitiesDto, CheckActivitiesDto, FilterAndPaginationActivitiesDto, OptionActivitiesDto, UpdateActivitiesDto } from '../../../dto/activities.dto';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { ActivitiesService } from './activities.service';
import { User } from '../../../interfaces/user/user.interface';
export declare class ActivitiesController {
    private activitiesService;
    private logger;
    constructor(activitiesService: ActivitiesService);
    addActivities(addActivitiesDto: AddActivitiesDto): Promise<ResponsePayload>;
    insertManyActivities(body: {
        data: AddActivitiesDto[];
        option: OptionActivitiesDto;
    }): Promise<ResponsePayload>;
    getAllActivitiess(filterActivitiesDto: FilterAndPaginationActivitiesDto, searchString: string): Promise<ResponsePayload>;
    getAllActivitiessBasic(): Promise<ResponsePayload>;
    productViewCount(data: {
        id: string;
        user: string;
    }): Promise<ResponsePayload>;
    getActivitiesById(id: string, select: string): Promise<ResponsePayload>;
    updateActivitiesById(id: string, updateActivitiesDto: UpdateActivitiesDto): Promise<ResponsePayload>;
    updateMultipleActivitiesById(updateActivitiesDto: UpdateActivitiesDto): Promise<ResponsePayload>;
    deleteActivitiesById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleActivitiesById(data: {
        ids: string[];
    }, checkUsage: boolean): Promise<ResponsePayload>;
    checkActivitiesAvailability(user: User, checkActivitiesDto: CheckActivitiesDto): Promise<ResponsePayload>;
}
