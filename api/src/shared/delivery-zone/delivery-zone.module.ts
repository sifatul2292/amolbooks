import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShippingChargeSchema } from '../../schema/shipping-charge.schema';
import { ProductSchema } from '../../schema/product.schema';
import { DeliveryZoneService } from './delivery-zone.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'ShippingCharge', schema: ShippingChargeSchema },
      { name: 'Product', schema: ProductSchema },
    ]),
  ],
  providers: [DeliveryZoneService],
  exports: [DeliveryZoneService],
})
export class DeliveryZoneModule {}
