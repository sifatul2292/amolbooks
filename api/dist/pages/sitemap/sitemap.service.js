"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SitemapService = void 0;
const common_1 = require("@nestjs/common");
const sitemap_1 = require("sitemap");
const product_service_1 = require("../product/product.service");
const blog_service_1 = require("../blog/blog/blog.service");
let SitemapService = class SitemapService {
    constructor(productService, blogService) {
        this.productService = productService;
        this.blogService = blogService;
    }
    async generateSitemapXml() {
        const smStream = new sitemap_1.SitemapStream({ hostname: 'https://your-domain.com' });
        smStream.write({ url: '/', changefreq: 'daily', priority: 1.0 });
        smStream.write({ url: '/about', changefreq: 'monthly', priority: 0.7 });
        smStream.write({ url: '/contact', changefreq: 'monthly', priority: 0.7 });
        const products = await this.productService.findAllPublished();
        products.forEach((product) => smStream.write({
            url: `/product-details/${product.slug}`,
            changefreq: 'weekly',
            priority: 0.8,
        }));
        const blogs = await this.blogService.findAllPublished();
        blogs.forEach((blog) => smStream.write({
            url: `/blogs/blog-details/${blog.slug}`,
            changefreq: 'weekly',
            priority: 0.7,
        }));
        smStream.end();
        const xml = await (0, sitemap_1.streamToPromise)(smStream);
        return xml.toString();
    }
};
SitemapService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [product_service_1.ProductService,
        blog_service_1.BlogService])
], SitemapService);
exports.SitemapService = SitemapService;
//# sourceMappingURL=sitemap.service.js.map