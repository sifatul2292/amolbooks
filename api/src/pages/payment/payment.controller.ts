import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Req,
  Res,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';

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
  @Throttle(20, 60)
  @UsePipes(ValidationPipe)
  async getInitSSL(
    @Body()
    body: any,
    @Req() req: any,
  ): Promise<ResponsePayload> {
    return await this.paymentService.initSSLPayment(body, req);
  }

  /**
   * EPS online payment (see PaymentService).
   */
  @Get('/eps/config')
  epsConfig(): ResponsePayload {
    return {
      success: true,
      message: 'Success',
      data: { enabled: this.paymentService.epsEnabled() },
    } as ResponsePayload;
  }

  @Get('/eps/status/:id')
  async epsStatus(@Param('id') id: string): Promise<ResponsePayload> {
    return await this.paymentService.epsOrderStatus(id);
  }

  @Post('/eps/retry/:id')
  @Throttle(5, 60)
  async epsRetry(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<ResponsePayload> {
    return await this.paymentService.retryEpsPayment(id, req);
  }

  // EPS sends the shopper back here (success, fail and cancel URLs).
  @Get('/eps/return/:mtid/:result')
  async epsReturnGet(
    @Param('mtid') mtid: string,
    @Param('result') result: string,
    @Res() res: Response,
  ): Promise<void> {
    await this.redirectAfterEps(mtid, result, res);
  }

  @Post('/eps/return/:mtid/:result')
  async epsReturnPost(
    @Param('mtid') mtid: string,
    @Param('result') result: string,
    @Res() res: Response,
  ): Promise<void> {
    await this.redirectAfterEps(mtid, result, res);
  }

  private async redirectAfterEps(
    mtid: string,
    result: string,
    res: Response,
  ): Promise<void> {
    let target: string;
    try {
      target = await this.paymentService.epsReturn(mtid, result);
    } catch (error) {
      this.logger.error(`EPS return failed for ${mtid}: ${error?.message}`);
      target = this.paymentService.epsResultUrl(null, 'pending');
    }
    res.set('Cache-Control', 'no-store');
    res.redirect(302, target);
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
