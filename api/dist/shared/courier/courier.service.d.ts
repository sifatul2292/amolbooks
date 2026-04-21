import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { CourierApiConfig, SteadfastCourierPayload } from './interfaces/courier.interface';
export declare class CourierService {
    private readonly httpService;
    private configService;
    private logger;
    constructor(httpService: HttpService, configService: ConfigService);
    private readonly config;
    createOrderWithProvider(courierApiConfig: CourierApiConfig, payload: SteadfastCourierPayload | any): Promise<any>;
    createPathaoOrder(order: any, env: 'sandbox' | 'live', specialInstruction: any, storeId: any): Promise<any>;
    computePathaoItemWeight(orderedItems: {
        quantity: number;
        weight?: number | null;
        unit?: string;
    }[]): number;
    convertToKg(value: number, unit: string): number;
    getAccessToken(env: 'sandbox' | 'live'): Promise<string>;
    getStoreId(env: 'sandbox' | 'live'): Promise<number>;
    resolveLocation(order: any, accessToken: string, baseUrl: string): Promise<{
        city_id: number;
        zone_id: any;
        area_id: any;
    }>;
    resolveCityId(division: string, accessToken: string, baseUrl: string): Promise<number>;
    getZonesByCity(city_id: number, accessToken: string, baseUrl: string): Promise<any>;
    getAreasByZone(zone_id: number, accessToken: string, baseUrl: string): Promise<any>;
    getOrderStatusFormCourier(courierApiConfig: any, consignmentId: any, orderId: any): Promise<any>;
    getOrderShortInfo(consignmentId: string, env: 'sandbox' | 'live'): Promise<any | null>;
    checkFraudOrder(phoneNo: string): Promise<any>;
}
