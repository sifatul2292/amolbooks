import { Response } from 'express';
import { SitemapService } from './sitemap.service';
export declare class SitemapController {
    private readonly sitemapService;
    constructor(sitemapService: SitemapService);
    getSitemap(res: Response): Promise<void>;
}
