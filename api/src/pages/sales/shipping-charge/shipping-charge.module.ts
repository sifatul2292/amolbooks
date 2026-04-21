import { Module } from '@nestjs/common';
import { ShippingChargeService } from './shipping-charge.service';
import { ShippingChargeController } from './shipping-charge.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { ShippingChargeSchema } from '../../../schema/shipping-charge.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'ShippingCharge', schema: ShippingChargeSchema },
    ]),
  ],
  providers: [ShippingChargeService],
  controllers: [ShippingChargeController],
})
export class ShippingChargeModule {}
