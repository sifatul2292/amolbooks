import {
  Body,
  Controller,
  Logger,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import { Throttle } from '@nestjs/throttler';
import { OtpService } from './otp.service';
import { AddOtpDto, ValidateOtpDto } from '../../dto/otp.dto';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';

@Controller('otp')
export class OtpController {
  private logger = new Logger(OtpController.name);

  constructor(private otpService: OtpService) {}

  /**
   * addOtp
   * insertManyOtp
   */
  @Post('/generate-otp')
  @Throttle(3, 60)
  @UsePipes(ValidationPipe)
  async generateOtpWithPhoneNo(
    @Body()
    addOtpDto: AddOtpDto,
  ): Promise<ResponsePayload> {
    return await this.otpService.generateOtpWithPhoneNo(addOtpDto);
  }

  @Post('/generate-otp-with-email')
  @Throttle(3, 60)
  @UsePipes(ValidationPipe)
  async generateOtpWithEmail(
    @Body()
    addOtpDto: AddOtpDto,
  ): Promise<ResponsePayload> {
    return await this.otpService.generateOtpWithEmail(addOtpDto);
  }

  @Post('/validate-otp')
  @Throttle(10, 60)
  @UsePipes(ValidationPipe)
  async validateOtpWithPhoneNo(
    @Body()
    validateOtpDto: ValidateOtpDto,
  ): Promise<ResponsePayload> {
    return await this.otpService.validateOtpWithPhoneNo(validateOtpDto);
  }

  @Post('/validate-otp-with-email')
  @Throttle(10, 60)
  @UsePipes(ValidationPipe)
  async validateOtpWithEmail(
    @Body()
    validateOtpDto: ValidateOtpDto,
  ): Promise<ResponsePayload> {
    return await this.otpService.validateOtpWithEmail(validateOtpDto);
  }
}
