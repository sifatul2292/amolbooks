import { Module } from '@nestjs/common';
import { AdditionalPageService } from './additional-page.service';
import { AdditionalPageController } from './additional-page.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { AdditionalPageSchema } from '../../schema/additional-page.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'AdditionalPage', schema: AdditionalPageSchema },
    ]),
  ],
  providers: [AdditionalPageService],
  controllers: [AdditionalPageController],
})
export class AdditionalPageModule {}
