import { JobSchedulerService } from './shared/job-scheduler/job-scheduler.service';
import { DbToolsService } from './shared/db-tools/db-tools.service';
import { ResponsePayload } from './interfaces/core/response-payload.interface';
export declare class AppService {
    private jobSchedulerService;
    private dbToolsService;
    constructor(jobSchedulerService: JobSchedulerService, dbToolsService: DbToolsService);
    backupDatabase(password: string): Promise<ResponsePayload>;
    restoreDatabase(password: string): Promise<ResponsePayload>;
}
