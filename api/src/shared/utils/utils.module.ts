import { Global, Module } from '@nestjs/common';
import { UtilsService } from './utils.service';
import { MongooseModule } from '@nestjs/mongoose';
import { PromoOfferSchema } from '../../schema/promo-offer.schema';
import { ProductSchema } from '../../schema/product.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'PromoOffer', schema: PromoOfferSchema },
      { name: 'Product', schema: ProductSchema },
    ]),
  ],
  providers: [UtilsService],
  exports: [UtilsService],
})
export class UtilsModule {}
