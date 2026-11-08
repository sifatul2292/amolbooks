import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductSchema } from '../../../schema/product.schema';
import { OrderAssistController } from './order-assist.controller';
import { OrderAssistService } from './order-assist.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'Product', schema: ProductSchema }])],
  controllers: [OrderAssistController],
  providers: [OrderAssistService],
})
export class OrderAssistModule {}
