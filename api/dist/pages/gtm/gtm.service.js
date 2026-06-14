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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var GtmService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GtmService = void 0;
const common_1 = require("@nestjs/common");
const utils_service_1 = require("../../shared/utils/utils.service");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const analytics_service_1 = require("../../shared/analytics/analytics.service");
const posthog_service_1 = require("../../shared/posthog/posthog.service");
let GtmService = GtmService_1 = class GtmService {
    constructor(settingModel, analyticsService, utilsService, posthogService) {
        this.settingModel = settingModel;
        this.analyticsService = analyticsService;
        this.utilsService = utilsService;
        this.posthogService = posthogService;
        this.logger = new common_1.Logger(GtmService_1.name);
    }
    getDistinctId(userData, ip) {
        if ((userData === null || userData === void 0 ? void 0 : userData.em) && userData.em !== 'null')
            return `em:${userData.em}`;
        if ((userData === null || userData === void 0 ? void 0 : userData.ph) && userData.ph !== 'null')
            return `ph:${userData.ph}`;
        return `ip:${ip || 'unknown'}`;
    }
    async getIP(req) {
        try {
            const clientIpAddress = this.utilsService.getClientIp(req);
            return {
                data: {
                    ip: clientIpAddress,
                },
            };
        }
        catch (error) {
            console.log(error);
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    async trackThemePageView(req, addGtmPageViewDto) {
        try {
            const fSetting = await this.settingModel.findOne().select('analytics');
            if (fSetting &&
                fSetting.analytics &&
                fSetting.analytics.facebookPixelId &&
                fSetting.analytics.facebookPixelAccessToken) {
                if (!this.utilsService.isValidFacebookPixelId(fSetting.analytics.facebookPixelId)) {
                    return {
                        success: false,
                        message: 'Sorry! Invalid Facebook Pixel ID',
                    };
                }
                if (!this.utilsService.isValidFacebookAccessTokenFormat(fSetting.analytics.facebookPixelAccessToken)) {
                    return {
                        success: false,
                        message: 'Sorry! Invalid Facebook Access Token',
                    };
                }
                const clientIpAddress = this.utilsService.getClientIp(req);
                const clientUserAgent = req.headers['user-agent'];
                const hostname = req.hostname || '';
                console.log('Hostname: [PageView] ', hostname);
                console.log('clientIpAddress', clientIpAddress);
                const fbApiPayload = Object.assign({}, addGtmPageViewDto);
                fbApiPayload.user_data = fbApiPayload.user_data || {};
                fbApiPayload.user_data.em =
                    fbApiPayload.user_data.em && fbApiPayload.user_data.em !== 'null'
                        ? fbApiPayload.user_data.em
                        : undefined;
                fbApiPayload.user_data.ph =
                    fbApiPayload.user_data.ph && fbApiPayload.user_data.ph !== 'null'
                        ? fbApiPayload.user_data.ph
                        : undefined;
                fbApiPayload.user_data.client_ip_address = clientIpAddress || undefined;
                fbApiPayload.user_data.client_user_agent = clientUserAgent || undefined;
                let payloadData = {};
                if (fSetting.analytics.isEnablePixelTestEvent &&
                    fSetting.analytics.facebookPixelTestEventId) {
                    payloadData = {
                        data: [fbApiPayload],
                        test_event_code: fSetting.analytics.facebookPixelTestEventId,
                    };
                }
                else {
                    payloadData = { data: [fbApiPayload] };
                }
                const result = await this.analyticsService.trackFbConversionEventClient(fSetting.analytics.facebookPixelId, fSetting.analytics.facebookPixelAccessToken, payloadData);
            }
            this.posthogService.capture(this.getDistinctId(addGtmPageViewDto.user_data, this.utilsService.getClientIp(req)), '$pageview', {
                $current_url: addGtmPageViewDto.pageUrl,
                title: addGtmPageViewDto.pageTitle,
                referrer: addGtmPageViewDto.referrer,
            });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (error) {
            console.log(error);
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    async trackThemeViewContent(req, addGtmViewContentDto) {
        try {
            const fSetting = await this.settingModel.findOne().select('analytics');
            if (fSetting &&
                fSetting.analytics &&
                fSetting.analytics.facebookPixelId &&
                fSetting.analytics.facebookPixelAccessToken) {
                if (!this.utilsService.isValidFacebookPixelId(fSetting.analytics.facebookPixelId)) {
                    return {
                        success: false,
                        message: 'Sorry! Invalid Facebook Pixel ID',
                    };
                }
                if (!this.utilsService.isValidFacebookAccessTokenFormat(fSetting.analytics.facebookPixelAccessToken)) {
                    return {
                        success: false,
                        message: 'Sorry! Invalid Facebook Access Token',
                    };
                }
                const clientIpAddress = this.utilsService.getClientIp(req);
                const clientUserAgent = req.headers['user-agent'];
                const hostname = req.hostname || '';
                console.log('Hostname: [ViewContent] ', hostname);
                const fbApiPayload = Object.assign({}, addGtmViewContentDto);
                fbApiPayload.user_data = fbApiPayload.user_data || {};
                fbApiPayload.user_data.em =
                    fbApiPayload.user_data.em && fbApiPayload.user_data.em !== 'null'
                        ? fbApiPayload.user_data.em
                        : undefined;
                fbApiPayload.user_data.ph =
                    fbApiPayload.user_data.ph && fbApiPayload.user_data.ph !== 'null'
                        ? fbApiPayload.user_data.ph
                        : undefined;
                fbApiPayload.user_data.client_ip_address = clientIpAddress || undefined;
                fbApiPayload.user_data.client_user_agent = clientUserAgent || undefined;
                let payloadData = {};
                if (fSetting.analytics.isEnablePixelTestEvent &&
                    fSetting.analytics.facebookPixelTestEventId) {
                    payloadData = {
                        data: [fbApiPayload],
                        test_event_code: fSetting.analytics.facebookPixelTestEventId,
                    };
                }
                else {
                    payloadData = { data: [fbApiPayload] };
                }
                const result = await this.analyticsService.trackFbConversionEventClient(fSetting.analytics.facebookPixelId, fSetting.analytics.facebookPixelAccessToken, payloadData);
            }
            this.posthogService.capture(this.getDistinctId(addGtmViewContentDto.user_data, this.utilsService.getClientIp(req)), 'product_viewed', {
                product_id: addGtmViewContentDto.contentId,
                product_name: addGtmViewContentDto.contentName,
                category: addGtmViewContentDto.contentCategory,
                price: addGtmViewContentDto.value,
                currency: addGtmViewContentDto.currency || 'BDT',
            });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (error) {
            console.log(error);
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    async trackThemeAddToCart(req, bodyData) {
        try {
            const fSetting = await this.settingModel.findOne().select('analytics');
            if (fSetting &&
                fSetting.analytics &&
                fSetting.analytics.facebookPixelId &&
                fSetting.analytics.facebookPixelAccessToken) {
                if (!this.utilsService.isValidFacebookPixelId(fSetting.analytics.facebookPixelId)) {
                    return {
                        success: false,
                        message: 'Sorry! Invalid Facebook Pixel ID',
                    };
                }
                if (!this.utilsService.isValidFacebookAccessTokenFormat(fSetting.analytics.facebookPixelAccessToken)) {
                    return {
                        success: false,
                        message: 'Sorry! Invalid Facebook Access Token',
                    };
                }
                const clientIpAddress = this.utilsService.getClientIp(req);
                const clientUserAgent = req.headers['user-agent'];
                const hostname = req.hostname || '';
                console.log('Hostname: [AddToCart]: ', hostname);
                const fbApiPayload = Object.assign({}, bodyData);
                fbApiPayload.user_data = fbApiPayload.user_data || {};
                fbApiPayload.user_data.em =
                    fbApiPayload.user_data.em && fbApiPayload.user_data.em !== 'null'
                        ? fbApiPayload.user_data.em
                        : undefined;
                fbApiPayload.user_data.ph =
                    fbApiPayload.user_data.ph && fbApiPayload.user_data.ph !== 'null'
                        ? fbApiPayload.user_data.ph
                        : undefined;
                fbApiPayload.user_data.client_ip_address = clientIpAddress || undefined;
                fbApiPayload.user_data.client_user_agent = clientUserAgent || undefined;
                let payloadData = {};
                if (fSetting.analytics.isEnablePixelTestEvent &&
                    fSetting.analytics.facebookPixelTestEventId) {
                    payloadData = {
                        data: [fbApiPayload],
                        test_event_code: fSetting.analytics.facebookPixelTestEventId,
                    };
                }
                else {
                    payloadData = { data: [fbApiPayload] };
                }
                const result = await this.analyticsService.trackFbConversionEventClient(fSetting.analytics.facebookPixelId, fSetting.analytics.facebookPixelAccessToken, payloadData);
            }
            this.posthogService.capture(this.getDistinctId(bodyData.user_data, this.utilsService.getClientIp(req)), 'add_to_cart', {
                product_id: bodyData.contentId,
                product_name: bodyData.contentName,
                category: bodyData.contentCategory,
                price: bodyData.value,
                quantity: bodyData.quantity,
                currency: bodyData.currency || 'BDT',
            });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (error) {
            console.log(error);
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    async trackThemeInitialCheckout(req, bodyData) {
        try {
            const fSetting = await this.settingModel.findOne().select('analytics');
            if (fSetting &&
                fSetting.analytics &&
                fSetting.analytics.facebookPixelId &&
                fSetting.analytics.facebookPixelAccessToken) {
                if (!this.utilsService.isValidFacebookPixelId(fSetting.analytics.facebookPixelId)) {
                    return {
                        success: false,
                        message: 'Sorry! Invalid Facebook Pixel ID',
                    };
                }
                if (!this.utilsService.isValidFacebookAccessTokenFormat(fSetting.analytics.facebookPixelAccessToken)) {
                    return {
                        success: false,
                        message: 'Sorry! Invalid Facebook Access Token',
                    };
                }
                const clientIpAddress = this.utilsService.getClientIp(req);
                const clientUserAgent = req.headers['user-agent'];
                const hostname = req.hostname || '';
                console.log('Hostname: [InitialCheckout] ', hostname);
                const fbApiPayload = Object.assign({}, bodyData);
                fbApiPayload.user_data = fbApiPayload.user_data || {};
                fbApiPayload.user_data.em =
                    fbApiPayload.user_data.em && fbApiPayload.user_data.em !== 'null'
                        ? fbApiPayload.user_data.em
                        : undefined;
                fbApiPayload.user_data.ph =
                    fbApiPayload.user_data.ph && fbApiPayload.user_data.ph !== 'null'
                        ? fbApiPayload.user_data.ph
                        : undefined;
                fbApiPayload.user_data.client_ip_address = clientIpAddress || undefined;
                fbApiPayload.user_data.client_user_agent = clientUserAgent || undefined;
                let payloadData = {};
                if (fSetting.analytics.isEnablePixelTestEvent &&
                    fSetting.analytics.facebookPixelTestEventId) {
                    payloadData = {
                        data: [fbApiPayload],
                        test_event_code: fSetting.analytics.facebookPixelTestEventId,
                    };
                }
                else {
                    payloadData = { data: [fbApiPayload] };
                }
                const result = await this.analyticsService.trackFbConversionEventClient(fSetting.analytics.facebookPixelId, fSetting.analytics.facebookPixelAccessToken, payloadData);
            }
            const checkoutProducts = (bodyData.products || bodyData.contents || []).map((p) => ({
                product_id: p.id || p.contentId || p.product_id,
                product_name: p.name || p.contentName || p.product_name,
                quantity: p.quantity,
                price: p.item_price || p.price || p.value,
            }));
            this.posthogService.capture(this.getDistinctId(bodyData.user_data, this.utilsService.getClientIp(req)), 'checkout_initiated', {
                products: checkoutProducts,
                total_items: bodyData.num_items || bodyData.total_items,
                cart_value: bodyData.value || bodyData.cart_value,
                currency: bodyData.currency || 'BDT',
            });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (error) {
            console.log(error);
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    async trackThemePurchase(req, bodyData) {
        try {
            const purchaseItems = (bodyData.products || bodyData.contents || []).map((p) => ({
                product_id: p.id || p.contentId || p.product_id,
                product_name: p.name || p.contentName || p.product_name,
                quantity: p.quantity,
                price: p.item_price || p.price || p.value,
            }));
            this.posthogService.capture(this.getDistinctId(bodyData.user_data, this.utilsService.getClientIp(req)), 'purchase_completed', {
                order_id: bodyData.event_id || bodyData.eventId || bodyData.order_id,
                revenue: bodyData.value || bodyData.revenue,
                currency: bodyData.currency || 'BDT',
                items: purchaseItems,
                coupon_code: bodyData.coupon_code || bodyData.couponCode || null,
                payment_method: bodyData.payment_method || bodyData.paymentMethod || null,
            });
            return {
                success: true,
                message: 'Success',
            };
        }
        catch (error) {
            console.log('err', error);
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
};
GtmService = GtmService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Setting')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        analytics_service_1.AnalyticsService,
        utils_service_1.UtilsService,
        posthog_service_1.PosthogService])
], GtmService);
exports.GtmService = GtmService;
//# sourceMappingURL=gtm.service.js.map