import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
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
  // @Version(VERSION_NEUTRAL)
  // @Post('/user-dashboard')
  // async getUserDashboard(@Body() data: any): Promise<ResponsePayload> {
  //
  //   return await this.dashboardService.getUserDashboard(data);
  // }

  // @Version(VERSION_NEUTRAL)
  // @Post('/admin-dashboard-order')
  // // @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN)
  // // @UseGuards(AdminRolesGuard)
  // // @UseGuards(AdminJwtAuthGuard)
  // async getAllOrdersForDashbord(
  //   @Body() filterOrderDto: FilterAndPaginationOrderDto,
  //   @Query('q') searchString: string,
  // ): Promise<ResponsePayload> {
  //   return this.dashboardService.getAllOrdersForDashbord(
  //     filterOrderDto,
  //     searchString,
  //   );
  // }
}
