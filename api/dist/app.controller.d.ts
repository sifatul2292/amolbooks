import { AppService } from './app.service';
import { ResponsePayload } from './interfaces/core/response-payload.interface';
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
    backupDatabase(password: string): Promise<ResponsePayload>;
    restoreDatabase(password: string): Promise<ResponsePayload>;
}
