import {
  Body,
  Controller,
  Logger,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import { PaymentService } from './payment.service';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';

@Controller('payment')
export class PaymentController {
  private logger = new Logger(PaymentController.name);

  constructor(private paymentService: PaymentService) {}

  /**
   * NAGAD PAYMENT
   * nagadCreatePayment()
   */
  // @Post('/nagad-create-payment')
  // @UsePipes(ValidationPipe)
  // async nagadCreatePayment(@Body() data: any): Promise<ResponsePayload> {
  //   //console.log('otp phone', addOtpDto);
  //   return await this.paymentService.nagadCreatePayment(data);
  // }
  //
  // @Post('/nagad-verify-payment')
  // @UsePipes(ValidationPipe)
  // async nagadVerifyPayment(
  //   @Body()
  //   body: any,
  // ): Promise<ResponsePayload> {
  //   return await this.paymentService.nagadVerifyPayment(body);
  // }

  @Post('/init-ssl')
  @UsePipes(ValidationPipe)
  async getInitSSL(
    @Body()
    body: any,
  ): Promise<ResponsePayload> {
    return await this.paymentService.initSSLPayment(body);
  }

  @Post('/ssl-ipn')
  @UsePipes(ValidationPipe)
  async ipnSSL(
    @Body()
    body: {
      status: string;
      tran_id: string;
      amount: number;
    },
  ): Promise<ResponsePayload> {
    //console.log('otp phone', addOtpDto);
    return await this.paymentService.ipn(body);
  }

  @Post('/create-bkash-payment')
  @UsePipes(ValidationPipe)
  async createBkashPayment(
    @Body()
    body: any,
  ): Promise<ResponsePayload> {
    return await this.paymentService.createBkashPayment(body);
  }

  @Post('/callback-bkash-payment')
  @UsePipes(ValidationPipe)
  async callbackBkashPayment(
    @Body()
    body: any,
  ): Promise<ResponsePayload> {
    return await this.paymentService.callbackBkashPayment(body);
  }




}
