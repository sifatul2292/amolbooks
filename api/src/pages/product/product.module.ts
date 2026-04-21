import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductSchema } from '../../schema/product.schema';
import { CategorySchema } from '../../schema/category.schema';
import { BrandSchema } from '../../schema/brand.schema';
import { PublisherSchema } from 'src/schema/publisher.schema';
import { ShopInformationSchema } from '../../schema/shop-information.schema';
import { RedirectUrlSchema } from '../../schema/redirect-url.schema';
import { SettingSchema } from '../customization/setting/schema/setting.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Product', schema: ProductSchema },
      { name: 'Category', schema: CategorySchema },
      { name: 'Brand', schema: BrandSchema },
      { name: 'Publisher', schema: PublisherSchema },
      { name: 'RedirectUrl', schema: RedirectUrlSchema },
      { name: 'ShopInformation', schema: ShopInformationSchema },
      { name: 'Setting', schema: SettingSchema },
    ]),
  ],
  providers: [ProductService],
  controllers: [ProductController],
  exports: [ProductService],
})
export class ProductModule {}
