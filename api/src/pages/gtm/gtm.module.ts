import { Module } from '@nestjs/common';
import { GtmService } from './gtm.service';
import { GtmController } from './gtm.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsModule } from '../../shared/analytics/analytics.module';
import { SettingSchema } from '../customization/setting/schema/setting.schema';


@Module({
  imports: [
    AnalyticsModule,
    MongooseModule.forFeature([{ name: 'Setting', schema: SettingSchema }]),
  ],
  providers: [GtmService],
  controllers: [GtmController],
})
export class GtmModule {
}
