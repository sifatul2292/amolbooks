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
            return { fromPath, toUrl: d.toUrl as string, wildcard: hasWildcard };
          });
        this.lastFetched = Date.now();
      } catch {
        // keep stale cache on DB error — never block requests
      } finally {
        this.inflight = null;
      }
      return this.cache;
    })();
    return this.inflight;
  }

  async use(req: Request, res: Response, next: NextFunction) {
    // Skip static assets — images, fonts, scripts, etc. must never hit the redirect DB
    if (STATIC_EXT_RE.test(req.path) || req.path.startsWith('/upload/')) {
      return next();
    }
    try {
      const redirects = await this.getRedirects();
      for (const r of redirects) {
        const matches = r.wildcard
          ? req.path.startsWith(r.fromPath)
          : req.path === r.fromPath;
        if (matches) {
          return res.redirect(301, r.toUrl);
        }
      }
    } catch {
      // never block on error
    }
    return next();
  }
}
