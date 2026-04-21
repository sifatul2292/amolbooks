import { PaymentService } from './payment.service';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
export declare class PaymentController {
    private paymentService;
    private logger;
    constructor(paymentService: PaymentService);
    getInitSSL(body: any): Promise<ResponsePayload>;
    ipnSSL(body: {
        status: string;
        tran_id: string;
        amount: number;
    }): Promise<ResponsePayload>;
    createBkashPayment(body: any): Promise<ResponsePayload>;
    callbackBkashPayment(body: any): Promise<ResponsePayload>;
}
