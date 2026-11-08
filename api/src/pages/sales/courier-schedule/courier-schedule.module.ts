import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderSchema } from '../../../schema/order.schema';
import { StaffActivityModule } from '../../staff-activity/staff-activity.module';
import { OrderModule } from '../order/order.module';
import { CourierScheduleController } from './courier-schedule.controller';
import { CourierScheduleService } from './courier-schedule.service';

@Module({
  imports: [
    OrderModule,
    StaffActivityModule,
    MongooseModule.forFeature([{ name: 'Order', schema: OrderSchema }]),
  ],
  controllers: [CourierScheduleController],
  providers: [CourierScheduleService],
})
export class CourierScheduleModule {}
