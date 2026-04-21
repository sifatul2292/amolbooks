import { Module } from '@nestjs/common';
import { ZoneController } from './zone.controller';
import { ZoneService } from './zone.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ZoneSchema } from '../../../schema/zone.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'Zone', schema: ZoneSchema }])],
  controllers: [ZoneController],
  providers: [ZoneService],
})
export class ZoneModule {}
