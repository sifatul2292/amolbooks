import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../../shared/utils/utils.service';
import { ShippingCharge } from '../../../interfaces/common/shipping-charge.interface';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { AddShippingChargeDto } from '../../../dto/shipping-charge.dto';
export declare class ShippingChargeService {
    private readonly shippingChargeModel;
    private configService;
    private utilsService;
    private logger;
    constructor(shippingChargeModel: Model<ShippingCharge>, configService: ConfigService, utilsService: UtilsService);
    addShippingCharge(addShippingChargeDto: AddShippingChargeDto): Promise<ResponsePayload>;
    getShippingCharge(select: string): Promise<ResponsePayload>;
}
