import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AnalyticsService {
  private logger = new Logger(AnalyticsService.name);

  constructor(private readonly httpService: HttpService) {}

  /**
   * Tracker
   * trackFbConversionEvent()
   */
  public async trackFbConversionEventClient(
    fbPixelId: string,
    fbPixelAccessToken: string,
    data: any,
  ) {
    const fbEndpoint = `https://graph.facebook.com/v22.0/${fbPixelId}/events`;

    try {
      const response = await firstValueFrom(
        this.httpService.post(fbEndpoint, data, {
          params: { access_token: fbPixelAccessToken },
        }),
      );

      return response.data;
    } catch (error) {
      // Log error details but don't throw - Facebook API errors shouldn't break the application
      const errorMessage = error?.response?.data?.error?.message || error?.message || 'Unknown error';
      const errorCode = error?.response?.status || error?.code || 'N/A';
      
      this.logger.warn(
        `Facebook Conversion API error (${errorCode}): ${errorMessage}`,
      );
      
      // Log full error in debug mode
      if (error?.response?.data) {
        this.logger.debug('Facebook API error details:', JSON.stringify(error.response.data, null, 2));
      }
      
      // Return null instead of throwing - allows the application to continue
      return null;
    }
  }
}
