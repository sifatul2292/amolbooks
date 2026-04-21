import { AddNotificationDto, FilterAndPaginationNotificationDto, OptionNotificationDto, UpdateNotificationDto } from '../../dto/notification.dto';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { NotificationService } from './notification.service';
export declare class NotificationController {
    private notificationService;
    private logger;
    constructor(notificationService: NotificationService);
    addNotification(addNotificationDto: AddNotificationDto): Promise<ResponsePayload>;
    insertManyNotification(body: {
        data: AddNotificationDto[];
        option: OptionNotificationDto;
    }): Promise<ResponsePayload>;
    getAllNotifications(filterNotificationDto: FilterAndPaginationNotificationDto, searchString: string): Promise<ResponsePayload>;
    getNotificationById(id: string, select: string): Promise<ResponsePayload>;
    updateNotificationById(id: string, updateNotificationDto: UpdateNotificationDto): Promise<ResponsePayload>;
    updateMultipleNotificationById(updateNotificationDto: UpdateNotificationDto): Promise<ResponsePayload>;
    deleteNotificationById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleNotificationById(data: {
        ids: string[];
    }, checkUsage: boolean): Promise<ResponsePayload>;
}
