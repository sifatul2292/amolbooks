// src/sitemap/sitemap.controller.ts
import { Controller, Get, Res, Version, VERSION_NEUTRAL } from '@nestjs/common';
import { Response } from 'express';
import { SitemapService } from './sitemap.service';

@Controller()
export class SitemapController {
  constructor(private readonly sitemapService: SitemapService) {}

  @Version(VERSION_NEUTRAL)
  @Get('sitemap.xml')
  async getSitemap(@Res() res: Response) {
    const sitemap = await this.sitemapService.generateSitemapXml();
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader(
      'Cache-Control',
      'public, max-age=3600, stale-while-revalidate=86400',
    );
    res.status(200).send(sitemap);
  }

  @Version(VERSION_NEUTRAL)
  @Get('robots.txt')
  getRobots(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(`User-agent: *
Allow: /
Disallow: /api/
Disallow: /account
Disallow: /cart
Disallow: /checkout
Disallow: /login
Disallow: /order-details
Disallow: /payment
Disallow: /registration
Disallow: /reset-password

Sitemap: https://www.amolbooks.com/sitemap.xml
`);
  }

  @Version(VERSION_NEUTRAL)
  @Get('fb-feed.xml')
  async getFbFeed(@Res() res: Response) {
    const feed = await this.sitemapService.generateFbFeedXml();
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(feed);
  }
}
