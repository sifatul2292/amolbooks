"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var CourierService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourierService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const rxjs_1 = require("rxjs");
const axios_2 = require("axios");
let CourierService = CourierService_1 = class CourierService {
    constructor(httpService, configService) {
        this.httpService = httpService;
        this.configService = configService;
        this.logger = new common_1.Logger(CourierService_1.name);
        this.config = {
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
    }
    async createOrderWithProvider(courierApiConfig, payload) {
        var _a, _b, _c, _d, _e, _f;
        const { providerName, apiKey, secretKey, username, password, storeId, specialInstruction, } = courierApiConfig;
        switch (providerName) {
            case 'Steadfast Courier':
                const steadfastApiUrl = 'https://portal.packzy.com/api/v1';
                try {
                    const response = this.httpService.post(`${steadfastApiUrl}/create_order`, payload, {
                        headers: {
                            'Content-Type': 'application/json',
                            Accept: 'application/json',
                            'Api-Key': apiKey,
                            'Secret-Key': secretKey,
                        },
                    });
                    const res = await (0, rxjs_1.firstValueFrom)(response);
                    return res.data;
                }
                catch (error) {
                    console.error('Steadfast Courier API Error:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                    return {
                        success: false,
                        message: `Failed to create order with Steadfast Courier: ${((_b = error.response) === null || _b === void 0 ? void 0 : _b.data) || error.message}`,
                        statusCode: ((_c = error.response) === null || _c === void 0 ? void 0 : _c.status) || 500,
                    };
                }
            case 'Pathao Courier':
                const env = process.env.PRODUCTION_BUILD === 'true' ? 'live' : 'sandbox';
                if (env === 'live') {
                    this.config.live.client_id = apiKey;
                    this.config.live.client_secret = secretKey;
                    this.config.live.username = username;
                    this.config.live.password = password;
                }
                try {
                    const rData = await this.createPathaoOrder(payload, env, specialInstruction, storeId);
                    return rData;
                }
                catch (error) {
                    console.error('Pathao Courier API Error:', ((_d = error.response) === null || _d === void 0 ? void 0 : _d.data) || error.message);
                    return {
                        success: false,
                        message: `Failed to create order with Pathao Courier: ${((_e = error.response) === null || _e === void 0 ? void 0 : _e.data) || error.message}`,
                        statusCode: ((_f = error.response) === null || _f === void 0 ? void 0 : _f.status) || 500,
                    };
                }
            case 'Paperfly Courier':
                console.log(payload);
                console.log(username);
                console.log(password);
                const paperflyApiUrl = 'https://api.paperfly.com.bd/merchant/api/service/new_order.php';
                const paperflyKey = 'Paperfly_~La?Rj73FcLm';
                console.log('wer.data');
                const response1 = await axios_2.default.post(paperflyApiUrl, payload, {
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
                return response1.data;
            default:
                return {
                    success: false,
                    message: 'Courier provider not supported',
                };
        }
    }
    async createPathaoOrder(order, env = 'sandbox', specialInstruction, storeId) {
        var _a, _b;
        const token = await this.getAccessToken(env);
        const { baseUrl } = this.config[env];
        const url = `${baseUrl}/aladdin/api/v1/orders`;
        const getFullAddress = () => {
            return `${order === null || order === void 0 ? void 0 : order.shippingAddress}`;
        };
        const cashOnDeliveryAmount = () => {
            var _a;
            if ((order === null || order === void 0 ? void 0 : order.paymentStatus) === 'paid') {
                return 0;
            }
            else {
                return (_a = order === null || order === void 0 ? void 0 : order.grandTotal) !== null && _a !== void 0 ? _a : 0;
            }
        };
        const pathaoStoreId = await this.getStoreId(env);
        const finalStoreId = typeof storeId === 'number' ? storeId : pathaoStoreId;
        console.log('this.computePathaoItemWeight(order.orderedItems)', this.computePathaoItemWeight(order.orderedItems));
        const payload = {
            store_id: finalStoreId,
            merchant_order_id: order.orderId,
            recipient_name: order.name,
            recipient_phone: order.phoneNo,
            recipient_address: getFullAddress(),
            delivery_type: order.deliveryType === 'express' ? 12 : 48,
            item_type: 4,
            item_quantity: order.orderedItems.reduce((sum, item) => sum + item.quantity, 0),
            item_weight: this.computePathaoItemWeight(order.orderedItems),
            item_description: ((_a = order.orderedItems) === null || _a === void 0 ? void 0 : _a.map((item, index) => `Product ${index + 1}: ${item.name}`).join(', ')) || 'Product',
            special_instruction: specialInstruction || '',
            amount_to_collect: cashOnDeliveryAmount(),
        };
        try {
            const res = await (0, rxjs_1.firstValueFrom)(this.httpService.post(url, payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }));
            return res.data;
        }
        catch (error) {
            const resData = (_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.data;
            const errMessage = (resData === null || resData === void 0 ? void 0 : resData.message) || (error === null || error === void 0 ? void 0 : error.message) || 'Unknown error occurred';
            const errDetails = (resData === null || resData === void 0 ? void 0 : resData.errors) || null;
            console.error(`[${env}] Order create error`, {
                message: errMessage,
                details: errDetails,
            });
            return {
                success: false,
                message: errMessage,
                details: errDetails,
            };
        }
    }
    computePathaoItemWeight(orderedItems) {
        const minWeightKg = 0.05;
        const missingItemWeightKg = 0.05;
        const totals = orderedItems.reduce((acc, it) => {
            const rawWeight = typeof it.weight === 'number' && !Number.isNaN(it.weight)
                ? it.weight
                : missingItemWeightKg;
            const weightInKg = this.convertToKg(rawWeight, it.unit || 'Kg');
            const qty = Number(it.quantity) || 0;
            acc.totalWeight += weightInKg * qty;
            acc.totalQty += qty;
            return acc;
        }, { totalWeight: 0, totalQty: 0 });
        const avg = totals.totalQty > 0 ? totals.totalWeight / totals.totalQty : minWeightKg;
        const itemWeight = Math.max(minWeightKg, avg);
        return Math.round(itemWeight * 100) / 100;
    }
    convertToKg(value, unit) {
        switch (unit) {
            case 'Ml':
                return value / 1000;
            case 'Gram':
                return value / 1000;
            case 'Kg':
            default:
                return value;
        }
    }
    async getAccessToken(env) {
        const _a = this.config[env], { baseUrl } = _a, creds = __rest(_a, ["baseUrl"]);
        const url = `${baseUrl}/aladdin/api/v1/issue-token`;
        const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(url, Object.assign(Object.assign({}, creds), { grant_type: 'password' }), {
            headers: { 'Content-Type': 'application/json' },
        }));
        return response.data.access_token;
    }
    async getStoreId(env) {
        var _a, _b;
        const accessToken = await this.getAccessToken(env);
        const baseUrl = this.config[env].baseUrl;
        const url = `${baseUrl}/aladdin/api/v1/stores`;
        const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        }));
        const stores = ((_b = (_a = response.data) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.data) || [];
        if (!stores.length) {
            throw new Error(`[${env}] No stores found for this account.`);
        }
        const defaultStore = stores.find((s) => s.is_default_store) || stores[0];
        return defaultStore.store_id;
    }
    async resolveLocation(order, accessToken, baseUrl) {
        var _a, _b;
        const city_id = await this.resolveCityId(order.division, accessToken, baseUrl);
        let zone_id = order.zone_id;
        if (!zone_id) {
            const zones = await this.getZonesByCity(city_id, accessToken, baseUrl);
            const shippingAddress = (order.shippingAddress || '').toLowerCase();
            let matchedZone = null;
            for (const z of zones) {
                if (shippingAddress.includes(z.zone_name.toLowerCase())) {
                    matchedZone = z;
                    break;
                }
            }
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
            zone_id = (matchedZone === null || matchedZone === void 0 ? void 0 : matchedZone.zone_id) || ((_a = zones === null || zones === void 0 ? void 0 : zones[0]) === null || _a === void 0 ? void 0 : _a.zone_id) || 1;
        }
        let area_id = order.area_id;
        if (!area_id) {
            const shippingAddress = (order.shippingAddress || '').toLowerCase();
            const areas = await this.getAreasByZone(zone_id, accessToken, baseUrl);
            let matchedArea = null;
            for (const a of areas) {
                if (shippingAddress.includes(a.area_name.toLowerCase())) {
                    matchedArea = a;
                    break;
                }
            }
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
            area_id = (matchedArea === null || matchedArea === void 0 ? void 0 : matchedArea.area_id) || ((_b = areas === null || areas === void 0 ? void 0 : areas[0]) === null || _b === void 0 ? void 0 : _b.area_id) || 1;
        }
        return { city_id, zone_id, area_id };
    }
    async resolveCityId(division, accessToken, baseUrl) {
        var _a, _b, _c;
        const fallbackCityId = 1;
        if (!division)
            return fallbackCityId;
        const formattedDivision = division.trim().toLowerCase();
        const url = `${baseUrl}/aladdin/api/v1/city-list`;
        try {
            const res = await (0, rxjs_1.firstValueFrom)(this.httpService.get(url, {
                headers: { Authorization: `Bearer ${accessToken}` },
            }));
            const cities = ((_b = (_a = res.data) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.data) || [];
            const match = cities.find((c) => c.city_name.toLowerCase().includes(formattedDivision));
            return (match === null || match === void 0 ? void 0 : match.city_id) || fallbackCityId;
        }
        catch (err) {
            console.error('City fetch error:', ((_c = err.response) === null || _c === void 0 ? void 0 : _c.data) || err.message);
            return fallbackCityId;
        }
    }
    async getZonesByCity(city_id, accessToken, baseUrl) {
        var _a, _b, _c;
        const url = `${baseUrl}/aladdin/api/v1/cities/${city_id}/zone-list`;
        try {
            const res = await (0, rxjs_1.firstValueFrom)(this.httpService.get(url, {
                headers: { Authorization: `Bearer ${accessToken}` },
            }));
            return ((_b = (_a = res.data) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.data) || [];
        }
        catch (err) {
            console.error('Zone fetch error:', ((_c = err.response) === null || _c === void 0 ? void 0 : _c.data) || err.message);
            return [];
        }
    }
    async getAreasByZone(zone_id, accessToken, baseUrl) {
        var _a, _b, _c;
        const url = `${baseUrl}/aladdin/api/v1/zones/${zone_id}/area-list`;
        try {
            const res = await (0, rxjs_1.firstValueFrom)(this.httpService.get(url, {
                headers: { Authorization: `Bearer ${accessToken}` },
            }));
            return ((_b = (_a = res.data) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.data) || [];
        }
        catch (err) {
            console.error('Area fetch error:', ((_c = err.response) === null || _c === void 0 ? void 0 : _c.data) || err.message);
            return [];
        }
    }
    async getOrderStatusFormCourier(courierApiConfig, consignmentId, orderId) {
        var _a, _b, _c, _d, _e, _f;
        const { providerName, apiKey, secretKey, merchantCode, username, password, } = courierApiConfig;
        switch (providerName) {
            case 'Steadfast Courier':
                try {
                    const steadfastApiUrl = 'https://portal.packzy.com/api/v1';
                    const response = this.httpService.get(`${steadfastApiUrl}/status_by_cid/${consignmentId}`, {
                        headers: {
                            'Content-Type': 'application/json',
                            Accept: 'application/json',
                            'Api-Key': apiKey,
                            'Secret-Key': secretKey,
                        },
                    });
                    const res = await (0, rxjs_1.firstValueFrom)(response);
                    return res.data;
                }
                catch (error) {
                    console.error(`[Steadfast Error] CID: ${consignmentId}`, ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                    return {
                        error: true,
                        message: 'Steadfast API call failed',
                        delivery_status: 'unknown',
                        details: ((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.data) || error.message,
                    };
                }
            case 'Paperfly Courier':
                try {
                    const paperflyApiUrl = 'https://api.paperfly.com.bd/API-Order-Tracking';
                    const paperflyKey = this.configService.get('paperflyKey');
                    const body = {
                        ReferenceNumber: orderId,
                        merchantCode: merchantCode,
                    };
                    const response = await axios_2.default.post(paperflyApiUrl, body, {
                        auth: {
                            username: username,
                            password: password,
                        },
                        headers: {
                            paperflykey: paperflyKey,
                            'Content-Type': 'application/json',
                        },
                    });
                    return response.data;
                }
                catch (error) {
                    console.error(`[Paperfly Error] CID: ${consignmentId}`, ((_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data) || error.message);
                    return {
                        error: true,
                        message: 'Paperfly API call failed',
                        delivery_status: 'unknown',
                        details: ((_d = error === null || error === void 0 ? void 0 : error.response) === null || _d === void 0 ? void 0 : _d.data) || error.message,
                    };
                }
            case 'Pathao Courier':
                try {
                    const env = process.env.PRODUCTION_BUILD === 'true' ? 'live' : 'sandbox';
                    if (env === 'live') {
                        this.config.live.client_id = apiKey;
                        this.config.live.client_secret = secretKey;
                        this.config.live.username = username;
                        this.config.live.password = password;
                    }
                    const orderInfo = await this.getOrderShortInfo(consignmentId, env);
                    return orderInfo;
                }
                catch (error) {
                    console.error(`[Pathao Error] CID: ${consignmentId}`, ((_e = error === null || error === void 0 ? void 0 : error.response) === null || _e === void 0 ? void 0 : _e.data) || error.message);
                    return {
                        error: true,
                        message: 'Pathao API call failed',
                        delivery_status: 'unknown',
                        details: ((_f = error === null || error === void 0 ? void 0 : error.response) === null || _f === void 0 ? void 0 : _f.data) || error.message,
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
    async getOrderShortInfo(consignmentId, env) {
        var _a, _b, _c;
        const accessToken = await this.getAccessToken(env);
        const baseUrl = this.config[env].baseUrl;
        const url = `${baseUrl}/aladdin/api/v1/orders/${consignmentId}/info`;
        console.log(`[${env}] Hitting URL: ${url}`);
        console.log(`[${env}] Using token: ${accessToken.substring(0, 10)}...`);
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(url, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }));
            const resData = response === null || response === void 0 ? void 0 : response.data;
            if ((resData === null || resData === void 0 ? void 0 : resData.code) !== 200) {
                console.warn(`[${env}] Unexpected response code for consignment ${consignmentId}`, resData);
                return null;
            }
            return resData;
        }
        catch (error) {
            const errRes = (_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data;
            if (((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.status) === 404 &&
                (errRes === null || errRes === void 0 ? void 0 : errRes.message) === 'Invalid order id') {
                console.warn(`[${env}] Consignment ID not found: ${consignmentId}`);
                return null;
            }
            if (((_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.status) === 401) {
                console.error(`[${env}] Unauthorized while fetching order info for consignment ${consignmentId}`, errRes);
                return null;
            }
            console.error(`[${env}] Failed to fetch order info for consignment ${consignmentId}`, errRes || error.message);
            throw new Error(`[${env}] Pathao order short info fetch failed.`);
        }
    }
    async checkFraudOrder(phoneNo) {
        var _a;
        const url = 'https://fraudspy.com.bd/api/v1/search';
        const apiKey = this.configService.get('fraudspyApiKey');
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(url, { phone: phoneNo }, {
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    Authorization: apiKey,
                },
            }));
            return response.data;
        }
        catch (error) {
            this.logger.error('Failed to call FraudSpy API', (_a = error.response) === null || _a === void 0 ? void 0 : _a.data);
            throw error;
        }
    }
};
CourierService = CourierService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        config_1.ConfigService])
], CourierService);
exports.CourierService = CourierService;
//# sourceMappingURL=courier.service.js.map