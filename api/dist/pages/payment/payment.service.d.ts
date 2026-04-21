import { Model } from 'mongoose';
import { UtilsService } from '../../shared/utils/utils.service';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { Order } from '../../interfaces/common/order.interface';
import { SslcommerzService } from '../../shared/sslcommerz/sslcommerz.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { BulkSmsService } from '../../shared/bulk-sms/bulk-sms.service';
import { Product } from '../../interfaces/common/product.interface';
export declare class PaymentService {
    private readonly orderModel;
    private readonly productModel;
    private utilsService;
    private sslService;
    private configService;
    private http;
    private bulkSmsService;
    private logger;
    constructor(orderModel: Model<Order>, productModel: Model<Product>, utilsService: UtilsService, sslService: SslcommerzService, configService: ConfigService, http: HttpService, bulkSmsService: BulkSmsService);
    initSSLPayment(body: any): Promise<ResponsePayload>;
    ipn(body: {
        status: string;
        tran_id: string;
        amount: number;
    }): Promise<ResponsePayload>;
    private getBkashToken;
    private executeBkashPayment;
    createBkashPayment(body: any): Promise<ResponsePayload>;
    callbackBkashPayment(body: {
        paymentID: string;
        status: string;
    }): Promise<ResponsePayload>;
}
