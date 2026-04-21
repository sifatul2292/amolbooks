import { AddShippingChargeDto } from '../../../dto/shipping-charge.dto';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { ShippingChargeService } from './shipping-charge.service';
export declare class ShippingChargeController {
    private shippingChargeService;
    private logger;
    constructor(shippingChargeService: ShippingChargeService);
    addShippingCharge(addShippingChargeDto: AddShippingChargeDto): Promise<ResponsePayload>;
    getShippingCharge(select: string): Promise<ResponsePayload>;
}
