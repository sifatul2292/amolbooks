import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { BackupLog } from './interface/backup-log.interface';
import { UtilsService } from '../utils/utils.service';
export declare class DbToolsService {
    private configService;
    private utilsService;
    private readonly backupLogModel;
    constructor(configService: ConfigService, utilsService: UtilsService, backupLogModel: Model<BackupLog>);
    backupMongoDb(): Promise<void>;
    restoreMongoDb(): Promise<void>;
    private zipDirectory;
    private uploadToGoogleDrive;
    private removeUploadedFile;
    private execToPromise;
}
