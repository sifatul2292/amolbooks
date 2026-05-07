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

@Injectable()
export class RedirectUrlMiddleware implements NestMiddleware {
  private cache: RedirectRule[] = [];
  private lastFetched = 0;
  private readonly TTL = 60_000;

  constructor(
    @InjectModel('RedirectUrl')
    private readonly redirectUrlModel: Model<RedirectUrl>,
  ) {}

  private async getRedirects(): Promise<RedirectRule[]> {
    const now = Date.now();
    if (now - this.lastFetched < this.TTL && this.cache.length > 0) {
      return this.cache;
    }
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
      this.lastFetched = now;
    } catch {
      // keep stale cache on DB error — never block requests
    }
    return this.cache;
  }

  async use(req: Request, res: Response, next: NextFunction) {
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
