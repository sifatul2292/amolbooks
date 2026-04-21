import {
  Body,
  Controller,
  Logger,
  Post,
  Req,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { GtmService } from './gtm.service';
import {
  AddGtmThemePageViewDto,
  AddGtmThemeViewContentDto,
} from './dto/gtm.dto';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';

@Controller('gtag')
export class GtmController {
  private logger = new Logger(GtmController.name);

  constructor(private gtmService: GtmService) {}

  /**
   * Main
   * trackThemePageView()
   * trackThemeViewContent()
   */

  @Post('/track-theme-page-view')
  @UsePipes(ValidationPipe)
  async trackThemePageView(
    @Req() req: Request,
    @Body() addGtmThemePageViewDto: AddGtmThemePageViewDto,
  ): Promise<ResponsePayload> {
    return await this.gtmService.trackThemePageView(
      req,
      addGtmThemePageViewDto,
    );
  }

  @Post('/track-theme-view-content')
  @UsePipes(ValidationPipe)
  async trackThemeViewContent(
    @Req() req: Request,
    @Body() addGtmThemeViewContentDto: AddGtmThemeViewContentDto,
  ): Promise<ResponsePayload> {
    return await this.gtmService.trackThemeViewContent(
      req,
      addGtmThemeViewContentDto,
    );
  }

  @Post('/track-theme-add-to-cart')
  @UsePipes(ValidationPipe)
  async trackThemeAddToCart(
    @Req() req: Request,
    @Body() bodyData: any,
  ): Promise<ResponsePayload> {
    return await this.gtmService.trackThemeAddToCart(req, bodyData);
  }

  @Post('/track-theme-initial-checkout')
  @UsePipes(ValidationPipe)
  async trackThemeInitialCheckout(
    @Req() req: Request,
    @Body() bodyData: any,
  ): Promise<ResponsePayload> {
    return await this.gtmService.trackThemeInitialCheckout(req, bodyData);
  }

  @Post('/track-theme-purchase')
  @UsePipes(ValidationPipe)
  async trackThemePurchase(
    @Req() req: Request,
    @Body() bodyData: any,
  ): Promise<ResponsePayload> {
    return await this.gtmService.trackThemePurchase(req, bodyData);
  }
}
