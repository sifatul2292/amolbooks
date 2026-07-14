import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Version,
  VERSION_NEUTRAL
} from "@nestjs/common";
import { DashboardService } from './dashboard.service';
import { AdminRolesGuard } from '../../guards/admin-roles.guard';
import { AdminRoles } from '../../enum/admin-roles.enum';
import { AdminMetaRoles } from '../../decorator/admin-roles.decorator';
import { AdminJwtAuthGuard } from '../../guards/admin-jwt-auth.guard';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { FilterAndPaginationOrderDto } from '../../dto/order.dto';

@Controller('dashboard')
export class DashboardController {
  private logger = new Logger(DashboardController.name);

  constructor(private dashboardService: DashboardService) {}

  /**
   * GET
   * getAdminDashboard()
   */

  @Version(VERSION_NEUTRAL)
  @Get('/admin-dashboard')
  // @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN)
  // @UseGuards(AdminRolesGuard)
  // @UseGuards(AdminJwtAuthGuard)
  async getAdminDashboard(
    @Query('q') searchString: string,
  ): Promise<ResponsePayload> {
    // GET requests don't support body, so we pass empty filter object
    const filterOrderDto: FilterAndPaginationOrderDto = {
      filter: null,
      pagination: null,
      sort: null,
      select: null,
    };
    return await this.dashboardService.getAdminDashboard(
      filterOrderDto,
      searchString,
    );
  }

  @Version(VERSION_NEUTRAL)
  @Get('/order-dashboard')
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN, AdminRoles.EDITOR)
  @UseGuards(AdminRolesGuard)
  @UseGuards(AdminJwtAuthGuard)
  @UsePipes(ValidationPipe)
  async getOrderDashboard(): Promise<ResponsePayload> {
    return await this.dashboardService.getOrderDashboard();
  }

  @Get('/graph')
  async getSalesData(@Query('period') period: string) {
    return this.dashboardService.getSalesData(period);
  }

  @Get('sales')
  async getSales(@Query('period') period: string) {
    try {
      return await this.dashboardService.getSalesData(period);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Version(VERSION_NEUTRAL)
  @Get('profit-analytics')
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN)
  @UseGuards(AdminRolesGuard)
  @UseGuards(AdminJwtAuthGuard)
  async getProfitAnalytics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return await this.dashboardService.getProfitAnalytics(startDate, endDate);
  }

  @Version(VERSION_NEUTRAL)
  @Get('products-sold')
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN)
  @UseGuards(AdminRolesGuard)
  @UseGuards(AdminJwtAuthGuard)
  async getProductsSold(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return await this.dashboardService.getProductsSold(startDate, endDate);
  }

  @Version(VERSION_NEUTRAL)
  @Get('top-products')
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN)
  @UseGuards(AdminRolesGuard)
  @UseGuards(AdminJwtAuthGuard)
  async getTopProducts(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return await this.dashboardService.getTopProducts(startDate, endDate);
  }
  /* ── Manual Sales (WhatsApp / Phone orders) ── */

  @Version(VERSION_NEUTRAL)
  @Get('manual-sales')
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN)
  @UseGuards(AdminRolesGuard)
  @UseGuards(AdminJwtAuthGuard)
  async getManualSales(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return await this.dashboardService.getManualSales(startDate, endDate);
  }

  @Version(VERSION_NEUTRAL)
  @Post('manual-sales')
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN)
  @UseGuards(AdminRolesGuard)
  @UseGuards(AdminJwtAuthGuard)
  async addManualSale(@Body() body: any) {
    return await this.dashboardService.addManualSale(body);
  }

  @Version(VERSION_NEUTRAL)
  @Delete('manual-sales/:id')
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN)
  @UseGuards(AdminRolesGuard)
  @UseGuards(AdminJwtAuthGuard)
  async deleteManualSale(@Param('id') id: string) {
    return await this.dashboardService.deleteManualSale(id);
  }
}
