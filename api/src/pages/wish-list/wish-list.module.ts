import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductSchema } from '../../schema/product.schema';
import { WishListController } from './wish-list.controller';
import { WishListService } from './wish-list.service';
import { UserSchema } from "../../schema/user.schema";
import {WishListSchema} from '../../schema/wish-list.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'WishList', schema: WishListSchema },
      { name: 'Product', schema: ProductSchema },
    ]),
  ],
  controllers: [WishListController],
  providers: [WishListService],
})
export class WishListModule {}
