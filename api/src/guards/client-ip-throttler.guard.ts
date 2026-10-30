import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Rate-limit each visitor instead of the proxy in front of the API.
 * Behind Cloudflare and nginx, req.ip is the local proxy address, so every
 * visitor shared one bucket and busy minutes returned 429 to everyone.
 */
@Injectable()
export class ClientIpThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): string {
    const headers = req.headers || {};
    const cloudflareIp = String(headers['cf-connecting-ip'] || '').trim();
    if (cloudflareIp) return cloudflareIp;
    const forwardedIp = String(headers['x-forwarded-for'] || '')
      .split(',')
      .map((ip) => ip.trim())
      .find(Boolean);
    return forwardedIp || req.ip;
  }
}
