import { Global, Module } from '@nestjs/common';
import { DbToolsService } from './db-tools.service';
import { MongooseModule } from '@nestjs/mongoose';
import { BackupLogSchema } from './schema/backup-log.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'BackupLog', schema: BackupLogSchema }]),
  ],
  providers: [DbToolsService],
  exports: [DbToolsService],
})
export class DbToolsModule {}
