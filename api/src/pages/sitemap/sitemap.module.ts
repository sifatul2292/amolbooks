// src/sitemap/sitemap.module.ts
import { Module } from '@nestjs/common';
import { SitemapController } from './sitemap.controller';
import { SitemapService } from './sitemap.service';
import { ProductModule } from '../product/product.module';
import { BlogModule } from '../blog/blog/blog.module';

@Module({
  imports: [ProductModule, BlogModule],
  controllers: [SitemapController],
  providers: [SitemapService],
})
export class SitemapModule {}
