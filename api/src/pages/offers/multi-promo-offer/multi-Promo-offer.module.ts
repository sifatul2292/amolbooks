import { Module } from '@nestjs/common';
import { MultiPromoOfferController } from './multi-promo-offer.controller';
import { MultiPromoOfferService } from './multi-promo-offer.service';
import { MongooseModule } from '@nestjs/mongoose';
import { MultiPromoOfferSchema } from '../../../schema/multi-promo-offer.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'MultiPromoOffer', schema: MultiPromoOfferSchema },
    ]),
  ],
  controllers: [MultiPromoOfferController],
  providers: [MultiPromoOfferService],
})
export class MultiPromoOfferModule {}
