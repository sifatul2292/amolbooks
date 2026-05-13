import {
  Injectable,
  Logger,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PostHog } from 'posthog-node';

@Injectable()
export class PosthogService implements OnApplicationShutdown {
  private readonly logger = new Logger(PosthogService.name);
  private client: PostHog | null = null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('POSTHOG_API_KEY');
    const host = this.configService.get<string>('POSTHOG_HOST') || 'https://us.i.posthog.com';

    if (apiKey) {
      this.client = new PostHog(apiKey, { host });
      this.logger.log('PostHog initialized');
    } else {
      this.logger.warn('POSTHOG_API_KEY not set — PostHog tracking disabled');
    }
  }

  /**
   * Fire an analytics event. Never throws — analytics must not break the app.
   * @param distinctId  User identifier (email, phone, or fallback like IP)
   * @param event       Event name e.g. 'purchase', 'add_to_cart'
   * @param properties  Any extra properties to attach
   */
  capture(distinctId: string, event: string, properties: Record<string, any> = {}): void {
    if (!this.client) return;
    try {
      this.client.capture({ distinctId, event, properties });
    } catch (err) {
      this.logger.warn(`PostHog capture failed for event "${event}": ${err?.message}`);
    }
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.client) {
      await this.client.shutdown();
    }
  }
}
