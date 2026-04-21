import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { OrderOfferService } from './order-offer.service';
import { User } from '../../../interfaces/user/user.interface';
import { AddOrderOfferDto } from '../../../dto/order-offer.dto';
export declare class OrderOfferController {
    private orderOfferService;
    private logger;
    constructor(orderOfferService: OrderOfferService);
    addOrderOffer(addOrderOfferDto: AddOrderOfferDto): Promise<ResponsePayload>;
    getOrderOffer(select: string): Promise<ResponsePayload>;
    getOrderOfferWithUser(user: User, select: string): Promise<ResponsePayload>;
}
