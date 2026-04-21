import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../../shared/utils/utils.service';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { User } from '../../../interfaces/user/user.interface';
import { Order } from '../../../interfaces/common/order.interface';
import { OrderOffer } from '../../../interfaces/common/order-offer.interface';
import { AddOrderOfferDto } from '../../../dto/order-offer.dto';
export declare class OrderOfferService {
    private readonly orderOfferModel;
    private readonly orderModel;
    private readonly userModel;
    private configService;
    private utilsService;
    private logger;
    constructor(orderOfferModel: Model<OrderOffer>, orderModel: Model<Order>, userModel: Model<User>, configService: ConfigService, utilsService: UtilsService);
    addOrderOffer(addOrderOfferDto: AddOrderOfferDto): Promise<ResponsePayload>;
    getOrderOffer(select: string): Promise<ResponsePayload>;
    getOrderOfferWithUser(user: User, select: string): Promise<ResponsePayload>;
}
