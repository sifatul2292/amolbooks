import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductSchema } from '../../../schema/product.schema';
import { OrderSchema } from '../../../schema/order.schema';
import { UniqueIdSchema } from '../../../schema/unique-id.schema';
import { CartSchema } from '../../../schema/cart.schema';
import { UserSchema } from '../../../schema/user.schema';
import { CouponSchema } from '../../../schema/coupon.schema';
import { OrderOfferSchema } from '../../../schema/order-offer.schema';
import { SpecialPackageSchema } from '../../../schema/special-package.schema';
import { ShopInformationSchema } from '../../../schema/shop-information.schema';
import { SettingSchema } from '../../customization/setting/schema/setting.schema';
import { AdminSchema } from '../../../schema/admin.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Order', schema: OrderSchema },
      { name: 'Product', schema: ProductSchema },
      { name: 'UniqueId', schema: UniqueIdSchema },
      { name: 'Cart', schema: CartSchema },
      { name: 'User', schema: UserSchema },
      { name: 'Coupon', schema: CouponSchema },
      { name: 'OrderOffer', schema: OrderOfferSchema },
      { name: 'SpecialPackage', schema: SpecialPackageSchema },
      { name: 'ShopInformation', schema: ShopInformationSchema },
      { name: 'Setting', schema: SettingSchema },
      { name: 'Admin', schema: AdminSchema },
    ]),
  ],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule {}
