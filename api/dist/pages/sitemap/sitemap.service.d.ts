import { ProductService } from '../product/product.service';
import { BlogService } from '../blog/blog/blog.service';
import { SpecialPackageService } from '../offers/special-package/special-package.service';
export declare class SitemapService {
    private readonly productService;
    private readonly blogService;
    private readonly specialPackageService;
    constructor(productService: ProductService, blogService: BlogService, specialPackageService: SpecialPackageService);
    generateSitemapXml(): Promise<string>;
    generateFbFeedXml(): Promise<string>;
}
