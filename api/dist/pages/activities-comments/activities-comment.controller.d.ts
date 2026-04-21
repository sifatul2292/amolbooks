import { AddActivitiesCommentDto, FilterAndPaginationActivitiesCommentDto, UpdateActivitiesCommentDto } from '../../dto/activities-comment.dto';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { ActivitiesCommentService } from './activities-comment.service';
import { User } from '../../interfaces/user/user.interface';
export declare class ActivitiesCommentController {
    private activitiesCommentService;
    private logger;
    constructor(activitiesCommentService: ActivitiesCommentService);
    addActivitiesComment(user: User, addActivitiesCommentDto: AddActivitiesCommentDto): Promise<ResponsePayload>;
    addActivitiesCommentByAdmin(addActivitiesCommentDto: AddActivitiesCommentDto): Promise<ResponsePayload>;
    getAllActivitiesComments(): Promise<ResponsePayload>;
    getAllActivitiesCommentsByQuery(filterActivitiesCommentDto: FilterAndPaginationActivitiesCommentDto, searchString: string): Promise<ResponsePayload>;
    getCartByUserId(user: User): Promise<ResponsePayload>;
    getActivitiesCommentById(id: string, select: string): Promise<ResponsePayload>;
    updateActivitiesCommentById(updateActivitiesCommentDto: UpdateActivitiesCommentDto): Promise<ResponsePayload>;
    updateActivitiesCommentByIdAndDelete(updateActivitiesCommentDto: UpdateActivitiesCommentDto): Promise<ResponsePayload>;
    deleteActivitiesCommentById(id: string): Promise<ResponsePayload>;
    deleteActivitiesCommentByLoggedinUserAndActivitiesCommentId(id: string, user: User): Promise<ResponsePayload>;
}
