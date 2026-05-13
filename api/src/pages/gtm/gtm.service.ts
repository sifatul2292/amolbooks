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
          sub_category: addGtmViewContentDto.contentSubCategory,
          value: addGtmViewContentDto.value,
          quantity: addGtmViewContentDto.quantity,
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
          value: bodyData.value,
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
      this.posthogService.capture(
        this.getDistinctId(bodyData.user_data, this.utilsService.getClientIp(req)),
        'checkout_initiated',
        {
          value: bodyData.value,
          num_items: bodyData.num_items,
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
        console.log('Hostname: [Purchase] ', hostname);

        const fbApiPayload: any = { ...bodyData };
        // Ensure user_data exists
        fbApiPayload.user_data = fbApiPayload.user_data || {};

        const ud = fbApiPayload.user_data;

        // Map GTM dataLayer field names → Meta CAPI field names
        // phone: accept both 'ph' and 'phone_number'
        ud.ph = (ud.ph && ud.ph !== 'null' ? ud.ph : null)
          || (ud.phone_number && ud.phone_number !== 'null' ? ud.phone_number : null)
          || undefined;
        delete ud.phone_number;

        // email
        ud.em = (ud.em && ud.em !== 'null' ? ud.em : null)
          || (ud.email_address && ud.email_address !== 'null' ? ud.email_address : null)
          || undefined;
        delete ud.email_address;

        // first/last name
        ud.fn = ud.fn || (ud.first_name && ud.first_name !== 'null' ? ud.first_name : undefined);
        ud.ln = ud.ln || (ud.last_name && ud.last_name !== 'null' ? ud.last_name : undefined);
        delete ud.first_name;
        delete ud.last_name;

        // country (keep as-is — 'bd' is correct ISO alpha-2)
        ud.country = ud.country || undefined;

        // Click ID / Browser ID (not hashed — pass through)
        ud.fbc = ud.fbc || undefined;
        ud.fbp = ud.fbp || undefined;

        // Server-side enrichment
        ud.client_ip_address = clientIpAddress || undefined;
        ud.client_user_agent = clientUserAgent || undefined;

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
      this.posthogService.capture(
        this.getDistinctId(bodyData.user_data, this.utilsService.getClientIp(req)),
        'purchase',
        {
          order_id: bodyData.eventId,
          value: bodyData.value,
          num_items: bodyData.num_items,
          currency: bodyData.currency || 'BDT',
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
