import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import {
  AddGtmThemePageViewDto,
  AddGtmThemeViewContentDto,
} from './dto/gtm.dto';
import { UtilsService } from '../../shared/utils/utils.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { AnalyticsService } from '../../shared/analytics/analytics.service';
import { PosthogService } from '../../shared/posthog/posthog.service';
import { Setting } from '../customization/setting/interface/setting.interface';

@Injectable()
export class GtmService {
  private logger = new Logger(GtmService.name);

  constructor(
    @InjectModel('Setting')
    private readonly settingModel: Model<Setting>,
    private readonly analyticsService: AnalyticsService,
    private readonly utilsService: UtilsService,
    private readonly posthogService: PosthogService,
  ) {}

  /**
   * Derive a stable distinct ID for PostHog from available user data.
   * Uses hashed email (em) > hashed phone (ph) > client IP as fallback.
   */
  private getDistinctId(userData: any, ip: string): string {
    if (userData?.em && userData.em !== 'null') return `em:${userData.em}`;
    if (userData?.ph && userData.ph !== 'null') return `ph:${userData.ph}`;
    return `ip:${ip || 'unknown'}`;
  }
  async getIP(req: Request): Promise<ResponsePayload> {
    try {
      const clientIpAddress = this.utilsService.getClientIp(req);
      return {
        data: {
          ip: clientIpAddress,
        },
      } as ResponsePayload;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(error.message);
    }
  }
  /**
   * Saleecom theme Analytics
   * trackPageView()
   * trackContentView()
   */
  async trackThemePageView(
    req: Request,
    addGtmPageViewDto: AddGtmThemePageViewDto,
  ): Promise<ResponsePayload> {
    try {
      const fSetting = await this.settingModel.findOne().select('analytics');
      if (
        fSetting &&
        fSetting.analytics &&
        fSetting.analytics.facebookPixelId &&
        fSetting.analytics.facebookPixelAccessToken
      ) {
        if (
          !this.utilsService.isValidFacebookPixelId(
            fSetting.analytics.facebookPixelId,
          )
        ) {
          return {
            success: false,
            message: 'Sorry! Invalid Facebook Pixel ID',
          } as ResponsePayload;
        }

        if (
          !this.utilsService.isValidFacebookAccessTokenFormat(
            fSetting.analytics.facebookPixelAccessToken,
          )
        ) {
          return {
            success: false,
            message: 'Sorry! Invalid Facebook Access Token',
          } as ResponsePayload;
        }

        const clientIpAddress = this.utilsService.getClientIp(req);
        const clientUserAgent = req.headers['user-agent'];

        const hostname = req.hostname || '';
        console.log('Hostname: [PageView] ', hostname);
        console.log('clientIpAddress', clientIpAddress);

        const fbApiPayload: any = { ...addGtmPageViewDto };

        // console.log('fbc from client:', addGtmPageViewDto);
        // Ensure user_data exists
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
        if (
          fSetting.analytics.isEnablePixelTestEvent &&
          fSetting.analytics.facebookPixelTestEventId
        ) {
          payloadData = {
            data: [fbApiPayload],
            test_event_code: fSetting.analytics.facebookPixelTestEventId,
          };
        } else {
          payloadData = { data: [fbApiPayload] };
        }
        const result = await this.analyticsService.trackFbConversionEventClient(
          fSetting.analytics.facebookPixelId,
          fSetting.analytics.facebookPixelAccessToken,
          payloadData,
        );
      }

      // PostHog — fires regardless of FB Pixel config
      this.posthogService.capture(
        this.getDistinctId(addGtmPageViewDto.user_data, this.utilsService.getClientIp(req)),
        '$pageview',
        {
          $current_url: addGtmPageViewDto.pageUrl,
          title: addGtmPageViewDto.pageTitle,
          referrer: addGtmPageViewDto.referrer,
        },
      );

      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async trackThemeViewContent(
    req: Request,
    addGtmViewContentDto: AddGtmThemeViewContentDto,
  ): Promise<ResponsePayload> {
    try {
      const fSetting = await this.settingModel.findOne().select('analytics');
      if (
        fSetting &&
        fSetting.analytics &&
        fSetting.analytics.facebookPixelId &&
        fSetting.analytics.facebookPixelAccessToken
      ) {
        if (
          !this.utilsService.isValidFacebookPixelId(
            fSetting.analytics.facebookPixelId,
          )
        ) {
          return {
            success: false,
            message: 'Sorry! Invalid Facebook Pixel ID',
          } as ResponsePayload;
        }

        if (
          !this.utilsService.isValidFacebookAccessTokenFormat(
            fSetting.analytics.facebookPixelAccessToken,
          )
        ) {
          return {
            success: false,
            message: 'Sorry! Invalid Facebook Access Token',
          } as ResponsePayload;
        }

        const clientIpAddress = this.utilsService.getClientIp(req);
        const clientUserAgent = req.headers['user-agent'];

        const hostname = req.hostname || '';
        console.log('Hostname: [ViewContent] ', hostname);

        const fbApiPayload: any = { ...addGtmViewContentDto };

        // Ensure user_data exists
        fbApiPayload.user_data = fbApiPayload.user_data || {};

        // console.log('addGtmViewContentDto:', addGtmViewContentDto);
        // console.log('fbc from client:', fbApiPayload.user_data?.fbc);

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
        if (
          fSetting.analytics.isEnablePixelTestEvent &&
          fSetting.analytics.facebookPixelTestEventId
        ) {
          payloadData = {
            data: [fbApiPayload],
            test_event_code: fSetting.analytics.facebookPixelTestEventId,
          };
        } else {
          payloadData = { data: [fbApiPayload] };
        }

        // console.log('payloadData:', payloadData);

        const result = await this.analyticsService.trackFbConversionEventClient(
          fSetting.analytics.facebookPixelId,
          fSetting.analytics.facebookPixelAccessToken,
          payloadData,
        );
      }

      // PostHog
      this.posthogService.capture(
        this.getDistinctId(addGtmViewContentDto.user_data, this.utilsService.getClientIp(req)),
        'product_viewed',
        {
          product_id: addGtmViewContentDto.contentId,
          product_name: addGtmViewContentDto.contentName,
          category: addGtmViewContentDto.contentCategory,
          price: addGtmViewContentDto.value,
          currency: addGtmViewContentDto.currency || 'BDT',
        },
      );

      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async trackThemeAddToCart(
    req: Request,
    bodyData: any,
  ): Promise<ResponsePayload> {
    try {
      const fSetting = await this.settingModel.findOne().select('analytics');
      if (
        fSetting &&
        fSetting.analytics &&
        fSetting.analytics.facebookPixelId &&
        fSetting.analytics.facebookPixelAccessToken
      ) {
        if (
          !this.utilsService.isValidFacebookPixelId(
            fSetting.analytics.facebookPixelId,
          )
        ) {
          return {
            success: false,
            message: 'Sorry! Invalid Facebook Pixel ID',
          } as ResponsePayload;
        }

        if (
          !this.utilsService.isValidFacebookAccessTokenFormat(
            fSetting.analytics.facebookPixelAccessToken,
          )
        ) {
          return {
            success: false,
            message: 'Sorry! Invalid Facebook Access Token',
          } as ResponsePayload;
        }

        const clientIpAddress = this.utilsService.getClientIp(req);
        const clientUserAgent = req.headers['user-agent'];

        const hostname = req.hostname || '';
        console.log('Hostname: [AddToCart]: ', hostname);

        const fbApiPayload: any = { ...bodyData };
        // Ensure user_data exists
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
        if (
          fSetting.analytics.isEnablePixelTestEvent &&
          fSetting.analytics.facebookPixelTestEventId
        ) {
          payloadData = {
            data: [fbApiPayload],
            test_event_code: fSetting.analytics.facebookPixelTestEventId,
          };
        } else {
          payloadData = { data: [fbApiPayload] };
        }

        // console.log('fbApiPayload:', fbApiPayload);

        const result = await this.analyticsService.trackFbConversionEventClient(
          fSetting.analytics.facebookPixelId,
          fSetting.analytics.facebookPixelAccessToken,
          payloadData,
        );
      }

      // PostHog
      this.posthogService.capture(
        this.getDistinctId(bodyData.user_data, this.utilsService.getClientIp(req)),
        'add_to_cart',
        {
          product_id: bodyData.contentId,
          product_name: bodyData.contentName,
          category: bodyData.contentCategory,
          price: bodyData.value,
          quantity: bodyData.quantity,
          currency: bodyData.currency || 'BDT',
        },
      );

      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(error.message); //
    }
  }

  async trackThemeInitialCheckout(
    req: Request,
    bodyData: any,
  ): Promise<ResponsePayload> {
    try {
      const fSetting = await this.settingModel.findOne().select('analytics');
      if (
        fSetting &&
        fSetting.analytics &&
        fSetting.analytics.facebookPixelId &&
        fSetting.analytics.facebookPixelAccessToken
      ) {
        if (
          !this.utilsService.isValidFacebookPixelId(
            fSetting.analytics.facebookPixelId,
          )
        ) {
          return {
            success: false,
            message: 'Sorry! Invalid Facebook Pixel ID',
          } as ResponsePayload;
        }

        if (
          !this.utilsService.isValidFacebookAccessTokenFormat(
            fSetting.analytics.facebookPixelAccessToken,
          )
        ) {
          return {
            success: false,
            message: 'Sorry! Invalid Facebook Access Token',
          } as ResponsePayload;
        }

        const clientIpAddress = this.utilsService.getClientIp(req);
        const clientUserAgent = req.headers['user-agent'];

        const hostname = req.hostname || '';
        console.log('Hostname: [InitialCheckout] ', hostname);

        const fbApiPayload: any = { ...bodyData };
        // Ensure user_data exists
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
        if (
          fSetting.analytics.isEnablePixelTestEvent &&
          fSetting.analytics.facebookPixelTestEventId
        ) {
          payloadData = {
            data: [fbApiPayload],
            test_event_code: fSetting.analytics.facebookPixelTestEventId,
          };
        } else {
          payloadData = { data: [fbApiPayload] };
        }

        const result = await this.analyticsService.trackFbConversionEventClient(
          fSetting.analytics.facebookPixelId,
          fSetting.analytics.facebookPixelAccessToken,
          payloadData,
        );
      }

      // PostHog
      const checkoutProducts = (bodyData.products || bodyData.contents || []).map((p: any) => ({
        product_id: p.id || p.contentId || p.product_id,
        product_name: p.name || p.contentName || p.product_name,
        quantity: p.quantity,
        price: p.item_price || p.price || p.value,
      }));
      this.posthogService.capture(
        this.getDistinctId(bodyData.user_data, this.utilsService.getClientIp(req)),
        'checkout_initiated',
        {
          products: checkoutProducts,
          total_items: bodyData.num_items || bodyData.total_items,
          cart_value: bodyData.value || bodyData.cart_value,
          currency: bodyData.currency || 'BDT',
        },
      );

      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async trackThemePurchase(
    req: Request,
    bodyData: any,
  ): Promise<ResponsePayload> {
    try {
      // Meta CAPI for purchase is handled exclusively by Stape server GTM.
      // Direct CAPI call removed to prevent duplicate Purchase events.
      // Stape reads the purchase event from Web GTM and fires [Stape] Meta - Purchase.

      // PostHog — capture purchase for internal analytics
      const purchaseItems = (bodyData.products || bodyData.contents || []).map((p: any) => ({
        product_id: p.id || p.contentId || p.product_id,
        product_name: p.name || p.contentName || p.product_name,
        quantity: p.quantity,
        price: p.item_price || p.price || p.value,
      }));
      this.posthogService.capture(
        this.getDistinctId(bodyData.user_data, this.utilsService.getClientIp(req)),
        'purchase_completed',
        {
          order_id: bodyData.event_id || bodyData.eventId || bodyData.order_id,
          revenue: bodyData.value || bodyData.revenue,
          currency: bodyData.currency || 'BDT',
          items: purchaseItems,
          coupon_code: bodyData.coupon_code || bodyData.couponCode || null,
          payment_method: bodyData.payment_method || bodyData.paymentMethod || null,
        },
      );

      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (error) {
      console.log('err', error);
      throw new InternalServerErrorException(error.message);
    }
  }
}
