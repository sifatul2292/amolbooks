import { OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class PosthogService implements OnApplicationShutdown {
    private readonly configService;
    private readonly logger;
    private client;
    constructor(configService: ConfigService);
    capture(distinctId: string, event: string, properties?: Record<string, any>): void;
    onApplicationShutdown(): Promise<void>;
}
