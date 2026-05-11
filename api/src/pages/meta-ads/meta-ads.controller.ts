import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Redirect,
  Res,
} from '@nestjs/common';
import { MetaAdsService } from './meta-ads.service';
import { Response } from 'express';

@Controller('meta-ads')
export class MetaAdsController {
  constructor(private readonly metaAdsService: MetaAdsService) {}

  // ─── OAuth ────────────────────────────────────────────────────────────────────

  @Get('auth-url')
  getAuthUrl() {
    const url = this.metaAdsService.getAuthUrl();
    return { success: true, url };
  }

  @Get('callback')
  async oauthCallback(@Query('code') code: string, @Res() res: Response) {
    const result = await this.metaAdsService.handleOAuthCallback(code);
    // Redirect to the profit dashboard after connecting
    res.redirect('/upload/static/profit-dashboard.html?connected=1');
    return result;
  }

  // ─── Status + Sync ────────────────────────────────────────────────────────────

  @Get('status')
  async getStatus() {
    return this.metaAdsService.getStatus();
  }

  @Post('sync')
  async syncAdSpend(
    @Body() body: { startDate: string; endDate: string },
  ) {
    return this.metaAdsService.syncAdSpend(body.startDate, body.endDate);
  }

  @Post('disconnect')
  async disconnect() {
    return this.metaAdsService.disconnect();
  }

  @Post('settings')
  async updateSettings(
    @Body() body: { exchangeRate?: number; adAccountId?: string },
  ) {
    return this.metaAdsService.updateSettings(body);
  }

  // ─── Ad Spend ─────────────────────────────────────────────────────────────────

  @Get('spend')
  async getAdSpend(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.metaAdsService.getAdSpend(startDate, endDate);
  }

  @Post('manual-spend')
  async addManualSpend(
    @Body() body: { date: string; spendBDT: number; spendUSD?: number },
  ) {
    return this.metaAdsService.addManualSpend(body);
  }

  @Delete('spend/:id')
  async deleteAdSpend(@Param('id') id: string) {
    return this.metaAdsService.deleteAdSpend(id);
  }

  // ─── Expenses ─────────────────────────────────────────────────────────────────

  @Get('expenses')
  async getExpenses(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.metaAdsService.getExpenses(startDate, endDate);
  }

  @Post('expenses')
  async addExpense(
    @Body() body: { date: string; amount: number; category?: string; note?: string },
  ) {
    return this.metaAdsService.addExpense(body);
  }

  @Delete('expenses/:id')
  async deleteExpense(@Param('id') id: string) {
    return this.metaAdsService.deleteExpense(id);
  }
}
