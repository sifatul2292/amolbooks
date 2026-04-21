import { Module } from '@nestjs/common';
import { OrderOfferService } from './order-offer.service';
import { OrderOfferController } from './order-offer.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderSchema } from '../../../schema/order.schema';
import { UserSchema } from '../../../schema/user.schema';
import { OrderOfferSchema } from '../../../schema/order-offer.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'OrderOffer', schema: OrderOfferSchema },
      { name: 'Order', schema: OrderSchema },
      { name: 'User', schema: UserSchema },
    ]),
  ],
  providers: [OrderOfferService],
  controllers: [OrderOfferController],
})
export class OrderOfferModule {}
