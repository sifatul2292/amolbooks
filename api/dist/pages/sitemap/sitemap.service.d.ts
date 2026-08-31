import { ProductService } from '../product/product.service';
import { BlogService } from '../blog/blog/blog.service';
export declare const SEO_LANDING_PAGES: {
    path: string;
    title: string;
    description: string;
    terms: string[];
}[];
export declare class SitemapService {
    private readonly productService;
    private readonly blogService;
    constructor(productService: ProductService, blogService: BlogService);
    generateSitemapXml(): Promise<string>;
    generateFbFeedXml(): Promise<string>;
    generateRobotsTxt(): string;
    generateSeoLandingPageHtml(path: string): Promise<string | null>;
}
