import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderSchema } from '../../schema/order.schema';
import { HttpModule, HttpService } from '@nestjs/axios';
import { ProductSchema } from '../../schema/product.schema';
import { EpsModule } from '../../shared/eps/eps.module';
import { OrderModule } from '../sales/order/order.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Order', schema: OrderSchema },
      { name: 'Product', schema: ProductSchema },
    ]),
    HttpModule,
    EpsModule,
    OrderModule,
  ],
  providers: [PaymentService],
  controllers: [PaymentController],
})
export class PaymentModule {}
