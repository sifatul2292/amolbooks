import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminSchema } from '../../schema/admin.schema';
import { OrderSchema } from '../../schema/order.schema';
import { IncompleteOrderSchema } from '../../schema/incomplete-order.schema';
import {
  StaffActivitySchema,
  StaffCallSchema,
  StaffPointsSchema,
} from './staff-activity.schema';
import { StaffActivityService } from './staff-activity.service';
import { StaffActivityController } from './staff-activity.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'StaffActivity', schema: StaffActivitySchema },
      { name: 'StaffPoints', schema: StaffPointsSchema },
      { name: 'StaffCall', schema: StaffCallSchema },
      { name: 'Admin', schema: AdminSchema },
      { name: 'Order', schema: OrderSchema },
      { name: 'IncompleteOrder', schema: IncompleteOrderSchema },
    ]),
  ],
  controllers: [StaffActivityController],
  providers: [StaffActivityService],
  exports: [StaffActivityService],
})
export class StaffActivityModule {}
