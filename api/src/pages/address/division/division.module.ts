import { Module } from '@nestjs/common';
import { DivisionController } from './division.controller';
import { DivisionService } from './division.service';
import { MongooseModule } from '@nestjs/mongoose';
import { DivisionSchema } from '../../../schema/division.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Division', schema: DivisionSchema }]),
  ],
  controllers: [DivisionController],
  providers: [DivisionService],
})
export class DivisionModule {}
