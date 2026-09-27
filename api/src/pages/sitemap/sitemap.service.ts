// src/sitemap/sitemap.service.ts
import { Injectable } from '@nestjs/common';
import { SitemapStream, streamToPromise } from 'sitemap';
import { ProductService } from '../product/product.service';
import { BlogService } from '../blog/blog/blog.service';

const STOREFRONT_ORIGIN = 'https://www.amolbooks.com';

@Injectable()
export class SitemapService {
  constructor(
    private readonly productService: ProductService,
    private readonly blogService: BlogService,
  ) {}

  async generateSitemapXml(): Promise<string> {
    const smStream = new SitemapStream({ hostname: STOREFRONT_ORIGIN });

    smStream.write({ url: '/', changefreq: 'daily', priority: 1.0 });
    smStream.write({ url: '/product-list', changefreq: 'daily', priority: 0.9 });
    smStream.write({ url: '/category-list', changefreq: 'weekly', priority: 0.7 });
    smStream.write({ url: '/author-list', changefreq: 'weekly', priority: 0.7 });
    smStream.write({ url: '/publisher-list', changefreq: 'weekly', priority: 0.7 });
    smStream.write({ url: '/blogs', changefreq: 'weekly', priority: 0.7 });
    smStream.write({ url: '/contact-us', changefreq: 'monthly', priority: 0.5 });

    const products = await this.productService.findAllPublished();
    products.forEach((product) =>
      smStream.write({
        url: `/product-details/${product.slug}`,
        lastmod: product.updatedAt,
        changefreq: 'weekly',
        priority: 0.9,
        img: product.images?.[0]
          ? [{ url: product.images[0], title: product.name }]
          : undefined,
      }),
    );

    const blogs = await this.blogService.findAllPublished();
    blogs.forEach((blog) =>
      smStream.write({
        url: `/blogs/blog-details/${blog._id}`,
        lastmod: blog.updatedAt,
        changefreq: 'monthly',
        priority: 0.6,
      }),
    );

    smStream.end();
    const xml = await streamToPromise(smStream);
    return xml.toString();
  }

  async generateFbFeedXml(): Promise<string> {
    return this.productService.getMetaFeedXml();
  }
}
