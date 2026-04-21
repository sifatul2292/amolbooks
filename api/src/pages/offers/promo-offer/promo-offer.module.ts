import { Module } from '@nestjs/common';
import { PromoOfferController } from './promo-offer.controller';
import { PromoOfferService } from './promo-offer.service';
import { MongooseModule } from '@nestjs/mongoose';
import { PromoOfferSchema } from '../../../schema/promo-offer.schema';
import { ProductModule } from '../../product/product.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'PromoOffer', schema: PromoOfferSchema },
      { name: 'Product', schema: ProductModule },
    ]),
  ],
  controllers: [PromoOfferController],
  providers: [PromoOfferService],
})
export class PromoOfferModule {}
