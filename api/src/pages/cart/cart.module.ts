import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CartSchema } from 'src/schema/cart.schema';
import { ProductSchema } from '../../schema/product.schema';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { UserSchema } from '../../schema/user.schema';
import { SpecialPackageSchema } from '../../schema/special-package.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'Cart', schema: CartSchema },
      { name: 'Product', schema: ProductSchema },
      { name: 'SpecialPackage', schema: SpecialPackageSchema },
    ]),
  ],
  controllers: [CartController],
  providers: [CartService],
})
export class CartModule {}
