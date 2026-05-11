import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { MetaAdsController } from './meta-ads.controller';
import { MetaAdsService } from './meta-ads.service';
import { AdSpendSchema } from '../../schema/ad-spend.schema';
import { ExpenseSchema } from '../../schema/expense.schema';
import { SettingSchema } from '../customization/setting/schema/setting.schema';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: 'AdSpend', schema: AdSpendSchema },
      { name: 'Expense', schema: ExpenseSchema },
      { name: 'Setting', schema: SettingSchema },
    ]),
  ],
  providers: [MetaAdsService],
  controllers: [MetaAdsController],
})
export class MetaAdsModule {}
