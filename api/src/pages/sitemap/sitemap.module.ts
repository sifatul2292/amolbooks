// src/sitemap/sitemap.module.ts
import { Module } from '@nestjs/common';
import { SitemapController } from './sitemap.controller';
import { SitemapService } from './sitemap.service';
import { StorefrontDocumentService } from './storefront-document.service';
import { ProductModule } from '../product/product.module';
import { BlogModule } from '../blog/blog/blog.module';
import { SpecialPackageModule } from '../offers/special-package/special-package.module';

@Module({
  imports: [ProductModule, BlogModule, SpecialPackageModule],
  controllers: [SitemapController],
  providers: [SitemapService, StorefrontDocumentService],
})
export class SitemapModule {}
