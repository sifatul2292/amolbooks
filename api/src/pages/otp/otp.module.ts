import { Module } from '@nestjs/common';
import { OtpService } from './otp.service';
import { OtpController } from './otp.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { OtpSchema } from '../../schema/otp.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Otp', schema: OtpSchema },
    ]),
  ],
  providers: [OtpService],
  controllers: [OtpController],
})
export class OtpModule {
}
