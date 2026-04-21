import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { SslInit } from '../../interfaces/common/ssl-init';
export declare class SslcommerzService {
    private readonly httpService;
    private configService;
    private logger;
    constructor(httpService: HttpService, configService: ConfigService);
    sslInit(data: SslInit): Promise<unknown>;
    validateSSL(data: any): void;
    transactionQueryBySessionIdSSL(data: any): Promise<unknown>;
    transactionQueryByTransactionIdSSL(data: any): void;
}
