import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Put,
  Query,
  UseGuards,
  Version,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { AdminMetaRoles } from '../../decorator/admin-roles.decorator';
import { GetAdmin } from '../../decorator/get-admin.decorator';
import { AdminRoles } from '../../enum/admin-roles.enum';
import { AdminJwtAuthGuard } from '../../guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from '../../guards/admin-roles.guard';
import { Admin } from '../../interfaces/admin/admin.interface';
import { StaffActivityService } from './staff-activity.service';

const ALL_STAFF = Object.values(AdminRoles);

@Controller('staff-activity')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
export class StaffActivityController {
  constructor(private readonly service: StaffActivityService) {}

  /** Who sent each parcel / wrote each note, for the rows on the order page. */
  @Version(VERSION_NEUTRAL)
  @Post('attribution')
  @HttpCode(200)
  @AdminMetaRoles(...ALL_STAFF)
  attribution(@Body() body: any) {
    return this.service.attribution(body?.ids, body?.kind);
  }

  @Version(VERSION_NEUTRAL)
  @Get('performance')
  @AdminMetaRoles(...ALL_STAFF)
  performance(@Query() query: any, @GetAdmin() admin: Admin) {
    return this.service.performance(query, admin);
  }

  @Version(VERSION_NEUTRAL)
  @Put('points')
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN)
  savePoints(@Body() body: any, @GetAdmin() admin: Admin) {
    return this.service.savePoints(body, admin);
  }
}
