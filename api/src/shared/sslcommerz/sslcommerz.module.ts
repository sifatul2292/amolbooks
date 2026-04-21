import { Global, Module } from '@nestjs/common';
import { SslcommerzService } from './sslcommerz.service';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';

@Global()
@Module({
  imports: [HttpModule, MongooseModule.forFeature([])],
  providers: [SslcommerzService],
  exports: [SslcommerzService],
})
export class SslcommerzModule {}

