import { Body, Controller, ForbiddenException, Get, Headers, HttpCode, Post, Query, Req, Res, ServiceUnavailableException, UnauthorizedException, Version, VERSION_NEUTRAL } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

/** Meta WhatsApp webhook (delivery updates) and the storefront's "is WhatsApp on" check. */
@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsapp: WhatsappService) {}

  /** Meta calls this once when the webhook is added in the app dashboard. */
  @Version(VERSION_NEUTRAL)
  @Get('webhook')
  verify(@Query() query: any, @Res() res: any) {
    const challenge = this.whatsapp.verifyWebhook(query);
    if (challenge === null) throw new ForbiddenException('Webhook verification failed.');
    res.status(200).type('text/plain').send(challenge);
  }

  /** Delivery updates and customers' messages / button taps; signed with the app secret (main.ts keeps the raw body for this path). */
  @Version(VERSION_NEUTRAL)
  @Post('webhook')
  @HttpCode(200)
  async receive(@Req() req: any, @Headers('x-hub-signature-256') signature: string, @Body() body: any) {
    if (!this.whatsapp.config().appSecret) throw new ServiceUnavailableException('Webhook is not configured.');
    if (!this.whatsapp.validSignature(req.rawBody, signature)) throw new UnauthorizedException('Invalid signature.');
    const { updated, handled } = await this.whatsapp.receiveWebhook(body);
    return { success: true, updated, handled };
  }

  /** Checkout shows "updates on WhatsApp" only while order messages are switched on. */
  @Version(VERSION_NEUTRAL)
  @Get('public-status')
  status() {
    return { success: true, data: { orderMessages: this.whatsapp.isActive('order_placed') } };
  }
}
