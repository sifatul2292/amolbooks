import { Module } from '@nestjs/common';
import { PreOrderController } from './pre-order.controller';
import { PreOrderService } from './pre-order.service';
import { MongooseModule } from '@nestjs/mongoose';
import { PreOrderSchema } from '../../schema/pre-order.schema';
import { ProductSchema } from '../../schema/product.schema';
import { UserSchema } from '../../schema/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'PreOrder', schema: PreOrderSchema },
      { name: 'Product', schema: ProductSchema },
      { name: 'User', schema: UserSchema },
    ]),
  ],
  controllers: [PreOrderController],
  providers: [PreOrderService],
  exports: [PreOrderService],
})
export class PreOrderModule {}

