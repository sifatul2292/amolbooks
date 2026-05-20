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
var PosthogService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PosthogService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const posthog_node_1 = require("posthog-node");
let PosthogService = PosthogService_1 = class PosthogService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(PosthogService_1.name);
        this.client = null;
        const apiKey = this.configService.get('POSTHOG_API_KEY');
        const host = this.configService.get('POSTHOG_HOST') || 'https://us.i.posthog.com';
        if (apiKey) {
            this.client = new posthog_node_1.PostHog(apiKey, { host });
            this.logger.log('PostHog initialized');
        }
        else {
            this.logger.warn('POSTHOG_API_KEY not set — PostHog tracking disabled');
        }
    }
    capture(distinctId, event, properties = {}) {
        if (!this.client)
            return;
        try {
            this.client.capture({ distinctId, event, properties });
        }
        catch (err) {
            this.logger.warn(`PostHog capture failed for event "${event}": ${err === null || err === void 0 ? void 0 : err.message}`);
        }
    }
    async onApplicationShutdown() {
        if (this.client) {
            await this.client.shutdown();
        }
    }
};
PosthogService = PosthogService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], PosthogService);
exports.PosthogService = PosthogService;
//# sourceMappingURL=posthog.service.js.map