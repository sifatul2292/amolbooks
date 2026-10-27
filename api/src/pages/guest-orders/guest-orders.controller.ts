import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  Param,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { GuestOrdersService } from './guest-orders.service';
import {
  GuestOrderPhoneDto,
  GuestOrderVerifyDto,
  GuestOrderCancelDto,
} from './guest-orders.dto';
@Controller('guest-orders')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class GuestOrdersController {
  constructor(private readonly service: GuestOrdersService) {}
  @Post('request-code')
  @Throttle(3, 60)
  @Header('Cache-Control', 'no-store')
  requestCode(@Body() dto: GuestOrderPhoneDto) {
    return this.service.requestCode(dto.phoneNo);
  }
  @Post('verify-code')
  @Throttle(10, 60)
  @Header('Cache-Control', 'no-store')
  verifyCode(@Body() dto: GuestOrderVerifyDto) {
    return this.service.verifyCode(dto.phoneNo, dto.code);
  }
  @Get()
  @Throttle(30, 60)
  @Header('Cache-Control', 'no-store')
  list(
    @Headers('authorization') auth: string,
    @Query('cursor') cursor: string,
  ) {
    return this.service.list(auth, cursor);
  }
  @Post(':id/cancel')
  @Throttle(10, 60)
  @Header('Cache-Control', 'no-store')
  cancel(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() dto: GuestOrderCancelDto,
  ) {
    return this.service.cancel(auth, id, dto.reason);
  }
  @Post('logout')
  @Header('Cache-Control', 'no-store')
  logout(@Headers('authorization') auth: string) {
    return this.service.logout(auth);
  }
}
