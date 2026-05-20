import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../pages/product/product.service';
import { SeoPageService } from '../pages/seo-page/seo-page.service';
export declare class SeoBotMiddleware implements NestMiddleware {
    private readonly productService;
    private readonly seoPageService;
    constructor(productService: ProductService, seoPageService: SeoPageService);
    use(req: Request, res: Response, next: NextFunction): Promise<void | Response<any, Record<string, any>>>;
}
