import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderSchema } from '../../schema/order.schema';
import { ProductSchema } from '../../schema/product.schema';
import { CustomerContactSchema } from './customer-manager.schema';
import { CustomerManagerService } from './customer-manager.service';
import { CustomerManagerController } from './customer-manager.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Order', schema: OrderSchema },
      { name: 'Product', schema: ProductSchema },
      { name: 'CustomerContact', schema: CustomerContactSchema },
    ]),
  ],
  controllers: [CustomerManagerController],
  providers: [CustomerManagerService],
})
export class CustomerManagerModule {}
