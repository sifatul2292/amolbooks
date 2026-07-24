import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema } from '../../schema/user.schema';
import { AdminSchema } from '../../schema/admin.schema';
import { ProductSchema } from '../../schema/product.schema';
import { OrderSchema } from '../../schema/order.schema';
import { ManualSaleSchema } from '../../schema/manual-sale.schema';
import { HttpModule } from '@nestjs/axios';
import { DecisionDashboardService } from './decision-dashboard.service';
import { AnalyticsActionSchema } from './schema/analytics-action.schema';
import { MetaAdSpendSchema } from '../meta-ads/schema/meta-ad-spend.schema';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: 'Admin', schema: AdminSchema },
      { name: 'User', schema: UserSchema },
      { name: 'Product', schema: ProductSchema },
      { name: 'Order', schema: OrderSchema },
      { name: 'ManualSale', schema: ManualSaleSchema },
      { name: 'MetaAdSpend', schema: MetaAdSpendSchema },
      { name: 'AnalyticsAction', schema: AnalyticsActionSchema },
    ]),
  ],
  providers: [DashboardService, DecisionDashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
