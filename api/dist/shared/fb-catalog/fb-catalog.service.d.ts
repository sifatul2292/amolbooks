import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
export declare class FbCatalogService {
    private readonly httpService;
    private configService;
    private logger;
    constructor(httpService: HttpService, configService: ConfigService);
    addFbCatalogProduct(data: any): Promise<any>;
    updateFbCatalogProduct(productId: string, data: any): Promise<any>;
}
