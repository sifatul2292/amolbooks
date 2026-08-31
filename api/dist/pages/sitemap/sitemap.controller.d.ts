import { Response } from 'express';
import { SitemapService } from './sitemap.service';
export declare class SitemapController {
    private readonly sitemapService;
    constructor(sitemapService: SitemapService);
    getSitemap(res: Response): Promise<void>;
    getRobots(res: Response): void;
    getSeoLandingPage(_params: Record<string, string>, res: Response): Promise<Response<any, Record<string, any>>>;
    getFbFeed(res: Response): Promise<void>;
}
