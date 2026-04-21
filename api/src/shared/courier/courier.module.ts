import { Global, Module } from '@nestjs/common';
import { CourierService } from './courier.service';
import { HttpModule } from '@nestjs/axios';

@Global()
@Module({
  imports: [HttpModule],
  providers: [CourierService],
  exports: [CourierService],
})
export class CourierModule {}
