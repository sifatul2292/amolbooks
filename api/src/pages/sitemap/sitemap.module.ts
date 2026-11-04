// src/sitemap/sitemap.module.ts
import { Module } from '@nestjs/common';
import { SitemapController } from './sitemap.controller';
import { SitemapService } from './sitemap.service';
import { StorefrontDocumentService } from './storefront-document.service';
import { ProductModule } from '../product/product.module';
import { BlogModule } from '../blog/blog/blog.module';
import { SpecialPackageModule } from '../offers/special-package/special-package.module';
import { MongooseModule } from '@nestjs/mongoose';
import { CatalogueSeoService } from './catalogue-seo.service';
import { AuthorSchema } from '../../schema/author.schema';
import { PublisherSchema } from '../../schema/publisher.schema';
import { CategorySchema } from '../../schema/category.schema';
import { ProductSchema } from '../../schema/product.schema';

@Module({
  imports: [
    ProductModule,
    BlogModule,
    SpecialPackageModule,
    MongooseModule.forFeature([
      { name: 'Author', schema: AuthorSchema },
      { name: 'Publisher', schema: PublisherSchema },
      { name: 'Category', schema: CategorySchema },
      { name: 'Product', schema: ProductSchema },
    ]),
  ],
  controllers: [SitemapController],
  providers: [SitemapService, StorefrontDocumentService, CatalogueSeoService],
})
export class SitemapModule {}
