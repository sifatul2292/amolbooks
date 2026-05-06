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
import { Setting } from '../customization/setting/interface/setting.interface';

@Injectable()
export class GtmService {
  private logger = new Logger(GtmService.name);

  constructor(
    @InjectModel('Setting')
    private readonly settingModel: Model<Setting>,
    private readonly analyticsService: AnalyticsService,
    private readonly utilsService: UtilsService,
  ) {}
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
