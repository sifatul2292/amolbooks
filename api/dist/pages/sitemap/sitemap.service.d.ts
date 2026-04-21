import { ProductService } from '../product/product.service';
import { BlogService } from '../blog/blog/blog.service';
export declare class SitemapService {
    private readonly productService;
    private readonly blogService;
    constructor(productService: ProductService, blogService: BlogService);
    generateSitemapXml(): Promise<string>;
}
