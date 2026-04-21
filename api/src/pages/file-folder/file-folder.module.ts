import { Module } from '@nestjs/common';
import { FileFolderController } from './file-folder.controller';
import { FileFolderService } from './file-folder.service';
import { MongooseModule } from '@nestjs/mongoose';
import { FileFolderSchema } from '../../schema/file-folder.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'FileFolder', schema: FileFolderSchema },
    ]),
  ],
  controllers: [FileFolderController],
  providers: [FileFolderService],
})
export class FileFolderModule {}
