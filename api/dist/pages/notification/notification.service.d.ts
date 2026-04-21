import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../shared/utils/utils.service';
import { Notification } from '../../interfaces/common/notification.interface';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { AddNotificationDto, FilterAndPaginationNotificationDto, OptionNotificationDto, UpdateNotificationDto } from '../../dto/notification.dto';
import { Product } from '../../interfaces/common/product.interface';
export declare class NotificationService {
    private readonly notificationModel;
    private readonly productModel;
    private configService;
    private utilsService;
    private logger;
    constructor(notificationModel: Model<Notification>, productModel: Model<Product>, configService: ConfigService, utilsService: UtilsService);
    addNotification(addNotificationDto: AddNotificationDto): Promise<ResponsePayload>;
    insertManyNotification(addNotificationsDto: AddNotificationDto[], optionNotificationDto: OptionNotificationDto): Promise<ResponsePayload>;
    getAllNotifications(filterNotificationDto: FilterAndPaginationNotificationDto, searchQuery?: string): Promise<ResponsePayload>;
    getNotificationById(id: string, select: string): Promise<ResponsePayload>;
    updateNotificationById(id: string, updateNotificationDto: UpdateNotificationDto): Promise<ResponsePayload>;
    updateMultipleNotificationById(ids: string[], updateNotificationDto: UpdateNotificationDto): Promise<ResponsePayload>;
    deleteNotificationById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleNotificationById(ids: string[], checkUsage: boolean): Promise<ResponsePayload>;
}
