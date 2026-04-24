import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import {
  CourierApiConfig,
  SteadfastCourierPayload,
} from './interfaces/courier.interface';
import { firstValueFrom } from 'rxjs';
import axios from 'axios';
@Injectable()
export class CourierService {
  private logger = new Logger(CourierService.name);

  constructor(
    private readonly httpService: HttpService,
    private configService: ConfigService,
  ) {}

  private readonly config = {
    sandbox: {
      baseUrl: 'https://courier-api-sandbox.pathao.com',
      client_id: '7N1aMJQbWm',
      client_secret: 'wRcaibZkUdSNz2EI9ZyuXLlNrnAv0TdPUPXMnD39',
      username: 'test@pathao.com',
      password: 'lovePathao',
      grant_type: 'password',
    },
    live: {
      baseUrl: 'https://api-hermes.pathao.com',
      client_id: '',
      client_secret: '',
      username: '',
      password: '',
      grant_type: 'password',
    },
  };

  // private tokens = {
  //   sandbox: '',
  //   live: '',
  // };

  /**
   * Courier API Methods
   * createOrderWithProvider()
   * getOrderStatusFormCourier()
   */

  // public async createOrderWithProvider(
  //   courierApiConfig: CourierApiConfig,
  //   payload: SteadfastCourierPayload | any,
  // ) {
  //   const {
  //     providerName,
  //     apiKey,
  //     secretKey,
  //     username,
  //     password,
  //     storeId,
  //     specialInstruction,
  //   } = courierApiConfig;
  //
  //   // console.log("courierApiConfig",courierApiConfig);
  //
  //   switch (providerName) {
  //     case 'Steadfast Courier':
  //       const steadfastApiUrl = 'https://portal.packzy.com/api/v1';
  //       const response = this.httpService.post(
  //         `${steadfastApiUrl}/create_order`,
  //         payload,
  //         {
  //           headers: {
  //             'Content-Type': 'application/json',
  //             Accept: 'application/json',
  //             'Api-Key': apiKey,
  //             'Secret-Key': secretKey,
  //           },
  //         },
  //       );
  //       const res = await firstValueFrom(response);
  //       return res.data;
  //
  //     case 'Pathao Courier':
  //       const env =
  //         process.env.PRODUCTION_BUILD === 'true' ? 'live' : 'sandbox';
  //
  //       if (env === 'live') {
  //         // const { apiKey, secretKey, username, password } = courierApiConfig;
  //         this.config.live.client_id = apiKey;
  //         this.config.live.client_secret = secretKey;
  //         this.config.live.username = username;
  //         this.config.live.password = password;
  //       }
  //
  //       const rData = await this.createPathaoOrder(
  //         payload,
  //         env,
  //         specialInstruction,
  //         storeId,
  //       ); // or 'live'
  //
  //       return rData;
  //     default:
  //       break;
  //   }
  // }

  public async createOrderWithProvider(
    courierApiConfig: CourierApiConfig,
    payload: SteadfastCourierPayload | any,
  ) {
    const {
      providerName,
      apiKey,
      secretKey,
      username,
      password,
      storeId,
      specialInstruction,
    } = courierApiConfig;

    switch (providerName) {
      case 'Steadfast Courier':
        const steadfastApiUrl = 'https://portal.packzy.com/api/v1';
        try {
          const response = this.httpService.post(
            `${steadfastApiUrl}/create_order`,
            payload,
            {
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'Api-Key': apiKey,
                'Secret-Key': secretKey,
              },
            },
          );
          const res = await firstValueFrom(response);
          return res.data;
        } catch (error) {
          console.error(
            'Steadfast Courier API Error:',
            error.response?.data || error.message,
          );
          return {
            success: false,
            message: `Failed to create order with Steadfast Courier: ${
              error.response?.data || error.message
            }`,
            statusCode: error.response?.status || 500,
          };
        }

      case 'Pathao Courier':
        const env =
          process.env.PRODUCTION_BUILD === 'true' ? 'live' : 'sandbox';

        if (env === 'live') {
          this.config.live.client_id = apiKey;
          this.config.live.client_secret = secretKey;
          this.config.live.username = username;
          this.config.live.password = password;
        }

        try {
          const rData = await this.createPathaoOrder(
            payload,
            env,
            specialInstruction,
            storeId,
          );

          return rData;
        } catch (error) {
          console.error(
            'Pathao Courier API Error:',
            error.response?.data || error.message,
          );
          return {
            success: false,
            message: `Failed to create order with Pathao Courier: ${
              error.response?.data || error.message
            }`,
            statusCode: error.response?.status || 500,
          };
        }
      case 'Paperfly Courier':
        // console.log('Paperfly Courier');
        console.log(payload);
        console.log(username);
        console.log(password);
        const paperflyApiUrl =
          'https://api.paperfly.com.bd/merchant/api/service/new_order.php';
        const paperflyKey = 'Paperfly_~La?Rj73FcLm';
        console.log('wer.data');
        const response1 = await axios.post(paperflyApiUrl, payload, {
          auth: {
            username,
            password,
          },
          headers: {
            Paperflykey: paperflyKey,
            'Content-Type': 'application/json',
          },
        });
        console.log('response1.data', response1.data);
        // const res1 = await firstValueFrom(response1);
        return response1.data;
      default:
        return {
          success: false,
          message: 'Courier provider not supported',
        };
    }
  }
  async createPathaoOrder(
    order: any,
    env: 'sandbox' | 'live' = 'sandbox',
    specialInstruction: any,
    storeId: any,
  ) {
    const token = await this.getAccessToken(env);
    const { baseUrl } = this.config[env];
    const url = `${baseUrl}/aladdin/api/v1/orders`;

    const getFullAddress = () => {
      // return `Division: ${order?.division}, ${order?.shippingAddress}`;
      return `${order?.shippingAddress}`;
    };

    const cashOnDeliveryAmount = () => {
      if (order?.paymentStatus === 'paid') {
        return 0;
      } else {
        return order?.grandTotal ?? 0;
      }
    };
    // console.log('env:', env);
    // console.log('this.config[env]:', this.config[env]);

    // const { city_id, zone_id, area_id } = await this.resolveLocation(
    //   order,
    //   token,
    //   baseUrl,
    // );

    const pathaoStoreId = await this.getStoreId(env);
    const finalStoreId = typeof storeId === 'number' ? storeId : pathaoStoreId;
    console.log(
      'this.computePathaoItemWeight(order.orderedItems)',
      this.computePathaoItemWeight(order.orderedItems),
    );

    const payload = {
      store_id: finalStoreId, // required
      merchant_order_id: order.orderId,
      recipient_name: order.name,
      recipient_phone: order.phoneNo,
      recipient_address: getFullAddress(),
      // recipient_city: city_id,
      // recipient_zone: zone_id,
      // recipient_area: area_id,
      delivery_type: order.deliveryType === 'express' ? 12 : 48,
      item_type: 4,
      item_quantity: order.orderedItems.reduce(
        (sum, item) => sum + item.quantity,
        0,
      ),
      item_weight: this.computePathaoItemWeight(order.orderedItems),
      item_description:
        order.orderedItems
          ?.map((item, index) => `Product ${index + 1}: ${item.name}`)
          .join(', ') || 'Product',
      special_instruction: specialInstruction || '',
      amount_to_collect: cashOnDeliveryAmount(),
    };

    try {
      const res = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      return res.data;
    } catch (error) {
      const resData = error?.response?.data;
      const errMessage =
        resData?.message || error?.message || 'Unknown error occurred';
      const errDetails = resData?.errors || null;

      console.error(`[${env}] Order create error`, {
        message: errMessage,
        details: errDetails,
      });

      // Return custom error to caller instead of throwing raw error
      return {
        success: false,
        message: errMessage,
        details: errDetails,
      };
    }
  }

  computePathaoItemWeight(
    orderedItems: { quantity: number; weight?: number | null; unit?: string }[],
  ): number {
    const minWeightKg = 0.05; // Pathao default minimum
    // const missingItemWeightKg = 1; // fallback
    const missingItemWeightKg = 0.05; // fallback

    const totals = orderedItems.reduce(
      (acc, it) => {
        const rawWeight =
          typeof it.weight === 'number' && !Number.isNaN(it.weight)
            ? it.weight
            : missingItemWeightKg;

        const weightInKg = this.convertToKg(rawWeight, it.unit || 'Kg');
        const qty = Number(it.quantity) || 0;

        acc.totalWeight += weightInKg * qty;
        acc.totalQty += qty;
        return acc;
      },
      { totalWeight: 0, totalQty: 0 },
    );

    const avg =
      totals.totalQty > 0 ? totals.totalWeight / totals.totalQty : minWeightKg;
    const itemWeight = Math.max(minWeightKg, avg);
    return Math.round(itemWeight * 100) / 100; // 2 decimal
  }

  convertToKg(value: number, unit: string): number {
    switch (unit) {
      case 'Ml':
        // 1000 ml ≈ 1 kg (ধরা হলো liquid-এর জন্য সাধারণত 1ml = 1g)
        return value / 1000;
      case 'Gram':
        return value / 1000; // 1000 gram = 1 kg
      case 'Kg':
      default:
        return value; // already in kg
    }
  }

  async getAccessToken(env: 'sandbox' | 'live'): Promise<string> {
    const { baseUrl, ...creds } = this.config[env];
    const url = `${baseUrl}/aladdin/api/v1/issue-token`;

    const response = await firstValueFrom(
      this.httpService.post(
        url,
        {
          ...creds,
          grant_type: 'password',
        },
        {
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    // this.tokens[env] = response.data.access_token;

    return response.data.access_token;
  }

  async getStoreId(env: 'sandbox' | 'live'): Promise<number> {
    const accessToken = await this.getAccessToken(env);
    const baseUrl = this.config[env].baseUrl;
    const url = `${baseUrl}/aladdin/api/v1/stores`;

    const response = await firstValueFrom(
      this.httpService.get(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }),
    );

    const stores = response.data?.data?.data || [];
    if (!stores.length) {
      throw new Error(`[${env}] No stores found for this account.`);
    }

    const defaultStore = stores.find((s) => s.is_default_store) || stores[0];
    return defaultStore.store_id;
  }

  async resolveLocation(order: any, accessToken: string, baseUrl: string) {
    const city_id = await this.resolveCityId(
      order.division,
      accessToken,
      baseUrl,
    );

    let zone_id = order.zone_id;
    // if (!zone_id) {
    //   const zones = await this.getZonesByCity(city_id, accessToken, baseUrl);
    //   zone_id = zones?.[0]?.zone_id || 1;
    //
    //   console.log("shippingAddress ", order.shippingAddress);
    //   console.log("zones", zones);
    // }
    if (!zone_id) {
      const zones = await this.getZonesByCity(city_id, accessToken, baseUrl);

      const shippingAddress = (order.shippingAddress || '').toLowerCase();

      // 1. Exact match
      let matchedZone = null;
      for (const z of zones) {
        if (shippingAddress.includes(z.zone_name.toLowerCase())) {
          matchedZone = z;
          break;
        }
      }

      // 2. Close match
      if (!matchedZone) {
        for (const z of zones) {
          const pattern = z.zone_name.toLowerCase().replace(/[-_\s]/g, '');
          const addrClean = shippingAddress.replace(/[^a-z0-9]/g, '');
          if (addrClean.includes(pattern)) {
            matchedZone = z;
            break;
          }
        }
      }

      zone_id = matchedZone?.zone_id || zones?.[0]?.zone_id || 1;
    }

    let area_id = order.area_id;
    if (!area_id) {
      // Example: shippingAddress already defined
      const shippingAddress = (order.shippingAddress || '').toLowerCase();

      // Call API to get areas by zone_id
      const areas = await this.getAreasByZone(zone_id, accessToken, baseUrl);

      // 1️⃣ Exact match
      let matchedArea = null;

      for (const a of areas) {
        if (shippingAddress.includes(a.area_name.toLowerCase())) {
          matchedArea = a;
          break;
        }
      }

      // 2️⃣ Close match
      if (!matchedArea) {
        for (const a of areas) {
          const pattern = a.area_name.toLowerCase().replace(/[-_\s]/g, '');
          const addrClean = shippingAddress.replace(/[^a-z0-9]/g, '');
          if (addrClean.includes(pattern)) {
            matchedArea = a;
            break;
          }
        }
      }

      // 3️⃣ Fallback
      area_id = matchedArea?.area_id || areas?.[0]?.area_id || 1;
    }

    return { city_id, zone_id, area_id };
  }

  async resolveCityId(
    division: string,
    accessToken: string,
    baseUrl: string,
  ): Promise<number> {
    const fallbackCityId = 1;
    if (!division) return fallbackCityId;

    const formattedDivision = division.trim().toLowerCase();
    const url = `${baseUrl}/aladdin/api/v1/city-list`;

    try {
      const res = await firstValueFrom(
        this.httpService.get(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );

      const cities = res.data?.data?.data || [];
      const match = cities.find((c) =>
        c.city_name.toLowerCase().includes(formattedDivision),
      );
      return match?.city_id || fallbackCityId;
    } catch (err) {
      console.error('City fetch error:', err.response?.data || err.message);
      return fallbackCityId;
    }
  }

  async getZonesByCity(city_id: number, accessToken: string, baseUrl: string) {
    const url = `${baseUrl}/aladdin/api/v1/cities/${city_id}/zone-list`;

    try {
      const res = await firstValueFrom(
        this.httpService.get(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );
      return res.data?.data?.data || [];
    } catch (err) {
      console.error('Zone fetch error:', err.response?.data || err.message);
      return [];
    }
  }

  async getAreasByZone(zone_id: number, accessToken: string, baseUrl: string) {
    const url = `${baseUrl}/aladdin/api/v1/zones/${zone_id}/area-list`;

    try {
      const res = await firstValueFrom(
        this.httpService.get(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );
      return res.data?.data?.data || [];
    } catch (err) {
      console.error('Area fetch error:', err.response?.data || err.message);
      return [];
    }
  }

  public async getOrderStatusFormCourier(
    courierApiConfig: any,
    consignmentId: any,
    orderId: any,
  ): Promise<any> {
    const {
      providerName,
      apiKey,
      secretKey,
      merchantCode,
      username,
      password,
    } = courierApiConfig;

    switch (providerName) {
      case 'Steadfast Courier':
        try {
          const steadfastApiUrl = 'https://portal.packzy.com/api/v1';

          const response = this.httpService.get(
            `${steadfastApiUrl}/status_by_cid/${consignmentId}`,
            {
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'Api-Key': apiKey,
                'Secret-Key': secretKey,
              },
            },
          );

          const res = await firstValueFrom(response);
          return res.data;
        } catch (error) {
          console.error(
            `[Steadfast Error] CID: ${consignmentId}`,
            error?.response?.data || error.message,
          );
          return {
            error: true,
            message: 'Steadfast API call failed',
            delivery_status: 'unknown',
            details: error?.response?.data || error.message,
          };
        }
      case 'Paperfly Courier':
        try {
          const paperflyApiUrl =
            'https://api.paperfly.com.bd/API-Order-Tracking';
          // const paperflyApiUrl1 = `https://go-app.paperfly.com.bd/merchant/api/react/order/track_order.php?order_number=${consignmentId}`;
          const paperflyKey = this.configService.get<string>('paperflyKey');
          const body = {
            ReferenceNumber: orderId,
            merchantCode: merchantCode,
          };
          const response = await axios.post(paperflyApiUrl, body, {
            auth: {
              username: username,
              password: password,
            },
            headers: {
              paperflykey: paperflyKey,
              'Content-Type': 'application/json',
            },
          });

          // --- Option 1: Track by consignmentId (GET)
          // const paperflyApiUrl2 = `https://go-app.paperfly.com.bd/merchant/api/react/order/track_order.php?order_number=${consignmentId}`;
          //
          // const res1 = await axios.get(paperflyApiUrl2, {
          //   auth: { username, password },
          //   headers: {
          //     paperflykey: paperflyKey,
          //     'Content-Type': 'application/json',
          //   },
          // });

          // const res = await firstValueFrom(response);
          return response.data;
          // return res1.data;
        } catch (error) {
          console.error(
            `[Paperfly Error] CID: ${consignmentId}`,
            error?.response?.data || error.message,
          );
          return {
            error: true,
            message: 'Paperfly API call failed',
            delivery_status: 'unknown',
            details: error?.response?.data || error.message,
          };
        }
      case 'Pathao Courier':
        try {
          const env =
            process.env.PRODUCTION_BUILD === 'true' ? 'live' : 'sandbox';

          if (env === 'live') {
            this.config.live.client_id = apiKey;
            this.config.live.client_secret = secretKey;
            this.config.live.username = username;
            this.config.live.password = password;
          }

          const orderInfo = await this.getOrderShortInfo(consignmentId, env);
          return orderInfo;
        } catch (error) {
          console.error(
            `[Pathao Error] CID: ${consignmentId}`,
            error?.response?.data || error.message,
          );
          return {
            error: true,
            message: 'Pathao API call failed',
            delivery_status: 'unknown',
            details: error?.response?.data || error.message,
          };
        }

      default:
        console.warn(`[Courier Error] Unsupported provider: ${providerName}`);
        return {
          error: true,
          message: `Unsupported provider: ${providerName}`,
          delivery_status: 'unknown',
        };
    }
  }

  async getOrderShortInfo(
    consignmentId: string,
    env: 'sandbox' | 'live',
  ): Promise<any | null> {
    const accessToken = await this.getAccessToken(env);
    const baseUrl = this.config[env].baseUrl;
    const url = `${baseUrl}/aladdin/api/v1/orders/${consignmentId}/info`;

    console.log(`[${env}] Hitting URL: ${url}`);
    console.log(`[${env}] Using token: ${accessToken.substring(0, 10)}...`);

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      const resData = response?.data;

      if (resData?.code !== 200) {
        console.warn(
          `[${env}] Unexpected response code for consignment ${consignmentId}`,
          resData,
        );
        return null;
      }

      return resData;
    } catch (error) {
      const errRes = error?.response?.data;

      // Handle 404 with "Invalid order id"
      if (
        error?.response?.status === 404 &&
        errRes?.message === 'Invalid order id'
      ) {
        console.warn(`[${env}] Consignment ID not found: ${consignmentId}`);
        return null;
      }

      // Handle 401 Unauthorized
      if (error?.response?.status === 401) {
        console.error(
          `[${env}] Unauthorized while fetching order info for consignment ${consignmentId}`,
          errRes,
        );
        return null;
      }

      console.error(
        `[${env}] Failed to fetch order info for consignment ${consignmentId}`,
        errRes || error.message,
      );

      // Only throw for unexpected critical failure
      throw new Error(`[${env}] Pathao order short info fetch failed.`);
    }
  }

  public async checkFraudOrder(phoneNo: string) {
    const url = 'https://fraudspy.com.bd/api/v1/search';
    const apiKey = this.configService.get<string>('fraudspyApiKey');

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          url,
          { phone: phoneNo },
          {
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error('Failed to call FraudSpy API', error.response?.data);
      throw error;
    }
  }
}
