import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../pages/product/product.service';
import { SeoPageService } from '../pages/seo-page/seo-page.service';
import { SpecialPackageService } from '../pages/offers/special-package/special-package.service';
export declare class SeoBotMiddleware implements NestMiddleware {
    private readonly productService;
    private readonly seoPageService;
    private readonly specialPackageService;
    constructor(productService: ProductService, seoPageService: SeoPageService, specialPackageService: SpecialPackageService);
    use(req: Request, res: Response, next: NextFunction): Promise<void | Response<any, Record<string, any>>>;
}
