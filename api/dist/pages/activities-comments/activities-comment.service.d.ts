import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../shared/utils/utils.service';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { AddActivitiesCommentDto, FilterAndPaginationActivitiesCommentDto, UpdateActivitiesCommentDto } from '../../dto/activities-comment.dto';
import { User } from '../../interfaces/user/user.interface';
import { Activities } from '../../interfaces/common/activities.interface';
import { Review } from '../../interfaces/common/review.interface';
export declare class ActivitiesCommentService {
    private readonly activitiesCommentModel;
    private readonly userModel;
    private readonly activitiesModel;
    private configService;
    private utilsService;
    private logger;
    constructor(activitiesCommentModel: Model<Review>, userModel: Model<User>, activitiesModel: Model<Activities>, configService: ConfigService, utilsService: UtilsService);
    addActivitiesComment(user: User, addActivitiesCommentDto: AddActivitiesCommentDto): Promise<ResponsePayload>;
    addActivitiesCommentByAdmin(addActivitiesCommentDto: AddActivitiesCommentDto): Promise<ResponsePayload>;
    getActivitiesCommentByUserId(user: User): Promise<ResponsePayload>;
    getAllActivitiesCommentsByQuery(filterActivitiesCommentDto: FilterAndPaginationActivitiesCommentDto, searchQuery?: string): Promise<ResponsePayload>;
    getAllActivitiesComments(): Promise<ResponsePayload>;
    getActivitiesCommentById(id: string, select: string): Promise<ResponsePayload>;
    updateActivitiesCommentById(updateActivitiesCommentDto: UpdateActivitiesCommentDto): Promise<ResponsePayload>;
    updateActivitiesCommentByIdAndDelete(updateActivitiesCommentDto: UpdateActivitiesCommentDto): Promise<ResponsePayload>;
    deleteActivitiesCommentById(id: string): Promise<ResponsePayload>;
    deleteActivitiesCommentByLoggedinUserAndActivitiesCommentId(id: string, user: User): Promise<ResponsePayload>;
}
