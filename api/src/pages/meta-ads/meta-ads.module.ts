import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { MetaAdsController } from './meta-ads.controller';
import { MetaAdsService } from './meta-ads.service';
import { MetaAdSpendSchema, MetaTokenSchema } from './schema/meta-ad-spend.schema';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: 'MetaAdSpend', schema: MetaAdSpendSchema },
      { name: 'MetaToken', schema: MetaTokenSchema },
    ]),
  ],
  controllers: [MetaAdsController],
  providers: [MetaAdsService],
  exports: [MetaAdsService],
})
export class MetaAdsModule {}
