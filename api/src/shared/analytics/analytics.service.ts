import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AnalyticsService {
  private logger = new Logger(AnalyticsService.name);

  constructor(private readonly httpService: HttpService) {}

  /**
   * Sends an event to the first-party server GTM Data Client. A successful
   * response means the event was claimed by the published server container,
   * so it is visible in the hosting event log and can run the existing tags.
   */
  public async trackServerContainerEvent(
    eventName: string,
    eventData: Record<string, any>,
  ): Promise<any> {
    const endpoint = 'https://server.amolbooks.com/data';
    const response = await firstValueFrom(
      this.httpService.post(
        endpoint,
        {
          ...eventData,
          event_name: eventName,
          v: 2,
        },
        {
          params: { v: 2, event_name: eventName },
          timeout: 10000,
        },
      ),
    );

    return response.data;
  }

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
          // Never leave a background conversion stuck indefinitely. Manual
          // orders retry with the same event_id, so Meta can safely deduplicate
          // an ambiguous network response.
          timeout: 10000,
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
