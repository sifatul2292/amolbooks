// src/sitemap/sitemap.service.ts
import { Injectable } from '@nestjs/common';
import { SitemapStream, streamToPromise } from 'sitemap';
import { createGzip } from 'zlib';
import { ProductService } from '../product/product.service';
import { BlogService } from '../blog/blog/blog.service'; // Example

@Injectable()
export class SitemapService {
  constructor(
    private readonly productService: ProductService,
    private readonly blogService: BlogService,
  ) {}

  async generateSitemapXml(): Promise<string> {
    const smStream = new SitemapStream({ hostname: 'https://your-domain.com' });

    smStream.write({ url: '/', changefreq: 'daily', priority: 1.0 });
    smStream.write({ url: '/about', changefreq: 'monthly', priority: 0.7 });
    smStream.write({ url: '/contact', changefreq: 'monthly', priority: 0.7 });

    const products = await this.productService.findAllPublished();
    products.forEach((product) =>
      smStream.write({
        url: `/product-details/${product.slug}`,
        changefreq: 'weekly',
        priority: 0.8,
      }),
    );

    const blogs = await this.blogService.findAllPublished();
    blogs.forEach((blog) =>
      smStream.write({
        url: `/blogs/blog-details/${blog.slug}`,
        changefreq: 'weekly',
        priority: 0.7,
      }),
    );

    smStream.end();
    const xml = await streamToPromise(smStream);
    return xml.toString(); // Return as plain string
  }
}
