import { Global, Module } from '@nestjs/common';
import { BulkSmsService } from './bulk-sms.service';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';

@Global()
@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      // { name: 'PromoOffer', schema: PromoOfferSchema },
      // { name: 'Product', schema: ProductSchema },
    ]),
  ],
  providers: [BulkSmsService],
  exports: [BulkSmsService],
})
export class BulkSmsModule {}
