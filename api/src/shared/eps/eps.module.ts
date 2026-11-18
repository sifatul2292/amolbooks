import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { EpsService } from './eps.service';

@Module({
  imports: [HttpModule],
  providers: [EpsService],
  exports: [EpsService],
})
export class EpsModule {}
