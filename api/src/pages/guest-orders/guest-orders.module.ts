import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderModule } from '../sales/order/order.module';
import { OrderSchema } from '../../schema/order.schema';
import { GuestOrderAccessSchema } from './guest-order-access.schema';
import { GuestOrdersService } from './guest-orders.service';
import { GuestOrdersController } from './guest-orders.controller';
@Module({
  imports: [
    OrderModule,
    MongooseModule.forFeature([
      { name: 'GuestOrderAccess', schema: GuestOrderAccessSchema },
      { name: 'Order', schema: OrderSchema },
    ]),
  ],
  providers: [GuestOrdersService],
  controllers: [GuestOrdersController],
  // The review page's login uses the same SMS codes (ReviewLoginService).
  exports: [GuestOrdersService],
})
export class GuestOrdersModule {}
