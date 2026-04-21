import { Module } from '@nestjs/common';
import { SeoPageController } from './seo-page.controller';
import { SeoPageService } from './seo-page.service';
import { MongooseModule } from '@nestjs/mongoose';
import { SeoPageSchema } from '../../schema/seo-page.schema';
import { ProductSchema } from '../../schema/product.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'SeoPage', schema: SeoPageSchema },
      { name: 'Product', schema: ProductSchema },
    ]),
  ],
  controllers: [SeoPageController],
  providers: [SeoPageService],
})
export class SeoPageModule {}
