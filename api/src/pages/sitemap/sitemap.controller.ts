// src/sitemap/sitemap.controller.ts
import { Controller, Get, Param, Res, Version, VERSION_NEUTRAL } from '@nestjs/common';
import { Response } from 'express';
import { SitemapService } from './sitemap.service';
import { SEO_LANDING_PAGES } from './sitemap.service';

@Controller()
export class SitemapController {
  constructor(private readonly sitemapService: SitemapService) {}

  @Version(VERSION_NEUTRAL)
  @Get('sitemap.xml')
  async getSitemap(@Res() res: Response) {
    const sitemap = await this.sitemapService.generateSitemapXml();
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(sitemap);
  }

  @Version(VERSION_NEUTRAL)
  @Get('robots.txt')
  getRobots(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(this.sitemapService.generateRobotsTxt());
  }

  @Version(VERSION_NEUTRAL)
  @Get(SEO_LANDING_PAGES.map((page) => page.path.replace(/^\//, '')))
  async getSeoLandingPage(@Param() _params: Record<string, string>, @Res() res: Response) {
    const html = await this.sitemapService.generateSeoLandingPageHtml(res.req.path);
    if (!html) return res.status(404).send('Not found');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.status(200).send(html);
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
