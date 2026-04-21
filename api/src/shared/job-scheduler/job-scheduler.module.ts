import { Global, Module } from '@nestjs/common';
import { JobSchedulerService } from './job-scheduler.service';
import { MongooseModule } from '@nestjs/mongoose';
import { JobSchedulerSchema } from '../../schema/job-scheduler.schema';
import { PromoOfferSchema } from '../../schema/promo-offer.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'JobScheduler', schema: JobSchedulerSchema },
      { name: 'PromoOffer', schema: PromoOfferSchema },
    ]),
  ],
  providers: [JobSchedulerService],
  exports: [JobSchedulerService],
})
export class JobSchedulerModule {}
