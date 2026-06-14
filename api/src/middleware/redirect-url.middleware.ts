import { Injectable, NestMiddleware } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Request, Response, NextFunction } from 'express';
import { Model } from 'mongoose';
import { RedirectUrl } from '../interfaces/common/redirect-url.interface';

interface RedirectRule {
  fromPath: string;
  toUrl: string;
  wildcard: boolean;
}

// Static asset extensions that should never be redirect-checked
const STATIC_EXT_RE = /\.(js|css|png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|eot|json|map|txt|xml|pdf|mp4|mp3|zip)$/i;

@Injectable()
export class RedirectUrlMiddleware implements NestMiddleware {
  private cache: RedirectRule[] = [];
  private lastFetched = 0;
  private readonly TTL = 60_000;
  private inflight: Promise<RedirectRule[]> | null = null;

  constructor(
    @InjectModel('RedirectUrl')
    private readonly redirectUrlModel: Model<RedirectUrl>,
  ) {}

  private async getRedirects(): Promise<RedirectRule[]> {
    const now = Date.now();
    if (now - this.lastFetched < this.TTL && this.lastFetched > 0) {
      return this.cache;
    }
    // Stampede protection: reuse the inflight fetch if one is already running
    if (this.inflight) {
      return this.inflight;
    }
    this.inflight = (async () => {
      try {
        const docs = await this.redirectUrlModel.find({}).lean();
        this.cache = docs
          .filter((d: any) => d.fromUrl && d.toUrl)
          .map((d: any) => {
            const hasWildcard = (d.fromUrl as string).endsWith('*');
            const cleanFrom = (d.fromUrl as string).replace(/\*$/, '');
            let fromPath: string;
            try {
              fromPath = new URL(cleanFrom).pathname;
            } catch {
              fromPath = cleanFrom.startsWith('/') ? cleanFrom : '/' + cleanFrom;
            }
            // Decode percent-encoding and normalize trailing slash to match req.path
            try { fromPath = decodeURIComponent(fromPath); } catch { /* keep raw */ }
            if (fromPath !== '/') fromPath = fromPath.replace(/\/+$/, '');
            return { fromPath, toUrl: d.toUrl as string, wildcard: hasWildcard };
          });
        console.log(`[RedirectMiddleware] loaded ${this.cache.length} rules from DB`);
        this.lastFetched = Date.now();
      } catch (err) {
        console.error('[RedirectMiddleware] DB fetch error:', err);
      } finally {
        this.inflight = null;
      }
      return this.cache;
    })();
    return this.inflight;
  }

  async use(req: Request, res: Response, next: NextFunction) {
    // Skip static assets — images, fonts, scripts, etc. must never hit the redirect DB
    if (STATIC_EXT_RE.test(req.path) || req.path.startsWith('/upload/') || req.path.startsWith('/api/')) {
      return next();
    }
    try {
      const redirects = await this.getRedirects();
      // Normalize: decode percent-encoding and strip trailing slash for comparison
      let reqPath: string;
      try {
        reqPath = decodeURIComponent(req.path);
      } catch {
        reqPath = req.path;
      }
      const normalizedReqPath = reqPath === '/' ? '/' : reqPath.replace(/\/+$/, '');

      console.log(`[RedirectMiddleware] checking "${normalizedReqPath}" against ${redirects.length} rules`);

      for (const r of redirects) {
        const matches = r.wildcard
          ? normalizedReqPath.startsWith(r.fromPath)
          : normalizedReqPath === r.fromPath;
        if (matches) {
          console.log(`[RedirectMiddleware] match: "${normalizedReqPath}" → ${r.toUrl}`);
          return res.redirect(301, r.toUrl);
        }
      }
    } catch (err) {
      console.error('[RedirectMiddleware] error:', err);
    }
    return next();
  }
}
