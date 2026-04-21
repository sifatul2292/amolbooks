// src/sitemap/sitemap.controller.ts
import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { SitemapService } from './sitemap.service';

@Controller()
export class SitemapController {
  constructor(private readonly sitemapService: SitemapService) {}

  @Get('sitemap.xml')
  async getSitemap(@Res() res: Response) {
    const sitemap = await this.sitemapService.generateSitemapXml(); // changed method name
    res.setHeader('Content-Type', 'application/xml');
    res.status(200).send(sitemap); // send as plain XML
  }
}
