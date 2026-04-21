import { Model } from 'mongoose';
import { JobScheduler } from '../../interfaces/core/job-scheduler.interface';
import { ConfigService } from '@nestjs/config';
import { PromoOffer } from '../../interfaces/common/promo-offer.interface';
import { UtilsService } from '../utils/utils.service';
import { DbToolsService } from '../db-tools/db-tools.service';
export declare class JobSchedulerService {
    private readonly jobSchedulerModel;
    private readonly promoOfferModel;
    private configService;
    private utilsService;
    private dbToolsService;
    private logger;
    constructor(jobSchedulerModel: Model<JobScheduler>, promoOfferModel: Model<PromoOffer>, configService: ConfigService, utilsService: UtilsService, dbToolsService: DbToolsService);
    autoBackupDatabaseToDrive(): Promise<void>;
    addOfferScheduleOnStart(isNew: boolean, id: string, expTime: Date, products: any[], jobId?: string): Promise<void>;
    addOfferScheduleOnEnd(isNew: boolean, id: string, expTime: Date, products: any[], jobId?: string): Promise<void>;
    cancelOfferJobScheduler(name: string): Promise<void>;
    reAddScheduler(): Promise<void>;
}
