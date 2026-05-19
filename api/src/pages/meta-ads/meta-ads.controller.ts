import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  VERSION_NEUTRAL,
  Version,
} from '@nestjs/common';
import { MetaAdsService } from './meta-ads.service';

@Controller('meta-ads')
export class MetaAdsController {
  constructor(private readonly metaAdsService: MetaAdsService) {}

  @Version(VERSION_NEUTRAL)
  @Get('auth-url')
  getAuthUrl() {
    const url = this.metaAdsService.getAuthUrl();
    if (!url) return { success: false, message: 'META_APP_ID or META_REDIRECT_URI not configured' };
    return { success: true, url };
  }

  @Version(VERSION_NEUTRAL)
  @Get('callback')
  async callback(@Query('code') code: string, @Res() res: any) {
    try {
      await this.metaAdsService.handleCallback(code);
      return res.redirect('https://apisub.amolbooks.com/upload/static/profit-dashboard.html?meta=connected');
    } catch (err) {
      return res.redirect('https://apisub.amolbooks.com/upload/static/profit-dashboard.html?meta=error');
    }
  }

  @Version(VERSION_NEUTRAL)
  @Get('status')
  getStatus() {
    return this.metaAdsService.getStatus();
  }

  @Version(VERSION_NEUTRAL)
  @Get('spend')
  getSpend(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.metaAdsService.getSpend(startDate, endDate);
  }

  @Version(VERSION_NEUTRAL)
  @Post('sync')
  sync(@Body() body: { startDate?: string; endDate?: string }) {
    return this.metaAdsService.syncSpend(body?.startDate, body?.endDate);
  }

  @Version(VERSION_NEUTRAL)
  @Post('set-account')
  setAccount(@Body() body: { adAccountId: string }) {
    return this.metaAdsService.setAdAccountId(body.adAccountId);
  }

  @Version(VERSION_NEUTRAL)
  @Post('manual-spend')
  manualSpend(@Body() body: { date: string; spend: number }) {
    return this.metaAdsService.saveManualSpend(body.date, body.spend);
  }

  @Version(VERSION_NEUTRAL)
  @Delete('spend/:id')
  deleteSpend(@Param('id') id: string) {
    return this.metaAdsService.deleteSpend(id);
  }

  @Version(VERSION_NEUTRAL)
  @Post('disconnect')
  disconnect() {
    return this.metaAdsService.disconnect();
  }

  // profit-dashboard.html also calls /expenses endpoints — stub them out
  @Version(VERSION_NEUTRAL)
  @Get('expenses')
  getExpenses(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return { success: true, data: [] };
  }

  @Version(VERSION_NEUTRAL)
  @Post('expenses')
  addExpense(@Body() body: any) {
    return { success: true, data: body };
  }

  @Version(VERSION_NEUTRAL)
  @Delete('expenses/:id')
  deleteExpense(@Param('id') id: string) {
    return { success: true };
  }
}
