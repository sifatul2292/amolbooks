import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
  VERSION_NEUTRAL,
  Version,
} from '@nestjs/common';
import { AdminMetaRoles } from '../../decorator/admin-roles.decorator';
import { AdminRoles } from '../../enum/admin-roles.enum';
import { AdminJwtAuthGuard } from '../../guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from '../../guards/admin-roles.guard';
import { MetaAdsService } from './meta-ads.service';

@Controller('meta-ads')
export class MetaAdsController {
  private readonly logger = new Logger(MetaAdsController.name);

  constructor(private readonly metaAdsService: MetaAdsService) {}

  @Version(VERSION_NEUTRAL)
  @Get('auth-url')
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN)
  @UseGuards(AdminRolesGuard)
  @UseGuards(AdminJwtAuthGuard)
  getAuthUrl() {
    const url = this.metaAdsService.getAuthUrl();
    if (!url) return { success: false, message: 'META_APP_ID or META_REDIRECT_URI not configured' };
    return { success: true, url };
  }

  @Version(VERSION_NEUTRAL)
  @Get('callback')
  async callback(@Query('code') code: string, @Res() res: any) {
    try {
      if (!code) throw new Error('Meta did not return an authorization code.');
      await this.metaAdsService.handleCallback(code);
      return res.redirect('https://apisub.amolbooks.com/upload/static/profit-dashboard.html?meta=connected');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Meta OAuth callback failed: ${message}`);
      return res.redirect('https://apisub.amolbooks.com/upload/static/profit-dashboard.html?meta=error');
    }
  }

  @Version(VERSION_NEUTRAL)
  @Get('status')
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN)
  @UseGuards(AdminRolesGuard)
  @UseGuards(AdminJwtAuthGuard)
  getStatus() {
    return this.metaAdsService.getStatus();
  }

  @Version(VERSION_NEUTRAL)
  @Get('spend')
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN)
  @UseGuards(AdminRolesGuard)
  @UseGuards(AdminJwtAuthGuard)
  getSpend(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.metaAdsService.getSpend(startDate, endDate);
  }

  @Version(VERSION_NEUTRAL)
  @Post('sync')
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN)
  @UseGuards(AdminRolesGuard)
  @UseGuards(AdminJwtAuthGuard)
  sync(@Body() body: { startDate?: string; endDate?: string }) {
    return this.metaAdsService.syncSpend(body?.startDate, body?.endDate);
  }

  @Version(VERSION_NEUTRAL)
  @Post('set-account')
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN)
  @UseGuards(AdminRolesGuard)
  @UseGuards(AdminJwtAuthGuard)
  setAccount(@Body() body: { adAccountId: string }) {
    return this.metaAdsService.setAdAccountId(body.adAccountId);
  }

  @Version(VERSION_NEUTRAL)
  @Post('manual-spend')
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN)
  @UseGuards(AdminRolesGuard)
  @UseGuards(AdminJwtAuthGuard)
  manualSpend(@Body() body: { date: string; spend: number }) {
    return this.metaAdsService.saveManualSpend(body.date, body.spend);
  }

  @Version(VERSION_NEUTRAL)
  @Delete('spend/:id')
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN)
  @UseGuards(AdminRolesGuard)
  @UseGuards(AdminJwtAuthGuard)
  deleteSpend(@Param('id') id: string) {
    return this.metaAdsService.deleteSpend(id);
  }

  @Version(VERSION_NEUTRAL)
  @Get('diagnose')
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN)
  @UseGuards(AdminRolesGuard)
  @UseGuards(AdminJwtAuthGuard)
  diagnose() {
    return this.metaAdsService.diagnose();
  }

  @Version(VERSION_NEUTRAL)
  @Post('disconnect')
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN)
  @UseGuards(AdminRolesGuard)
  @UseGuards(AdminJwtAuthGuard)
  disconnect() {
    return this.metaAdsService.disconnect();
  }

  // profit-dashboard.html also calls /expenses endpoints — stub them out
  @Version(VERSION_NEUTRAL)
  @Get('expenses')
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN)
  @UseGuards(AdminRolesGuard)
  @UseGuards(AdminJwtAuthGuard)
  getExpenses(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return { success: true, data: [] };
  }

  @Version(VERSION_NEUTRAL)
  @Post('expenses')
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN)
  @UseGuards(AdminRolesGuard)
  @UseGuards(AdminJwtAuthGuard)
  addExpense(@Body() body: any) {
    return { success: true, data: body };
  }

  @Version(VERSION_NEUTRAL)
  @Delete('expenses/:id')
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN)
  @UseGuards(AdminRolesGuard)
  @UseGuards(AdminJwtAuthGuard)
  deleteExpense(@Param('id') id: string) {
    return { success: true };
  }
}
