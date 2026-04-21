import { Module } from '@nestjs/common';
import { ShopInformationService } from './shop-information.service';
import { ShopInformationController } from './shop-information.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { ShopInformationSchema } from '../../../schema/shop-information.schema';
import { ProductSchema } from '../../../schema/product.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'ShopInformation', schema: ShopInformationSchema },
      { name: 'Product', schema: ProductSchema },
    ]),
  ],
  providers: [ShopInformationService],
  controllers: [ShopInformationController],
})
export class ShopInformationModule {}
