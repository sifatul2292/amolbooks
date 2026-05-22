// src/sitemap/sitemap.controller.ts
import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { SitemapService } from './sitemap.service';

@Controller()
export class SitemapController {
  constructor(private readonly sitemapService: SitemapService) {}

  @Get('sitemap.xml')
  async getSitemap(@Res() res: Response) {
    const sitemap = await this.sitemapService.generateSitemapXml();
    res.setHeader('Content-Type', 'application/xml');
    res.status(200).send(sitemap);
  }

  @Get('fb-feed.xml')
  async getFbFeed(@Res() res: Response) {
    const feed = await this.sitemapService.generateFbFeedXml();
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(feed);
  }
}
