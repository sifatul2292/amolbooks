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
import { SkipThrottle } from '@nestjs/throttler';
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

  /** "+ Add note" on the order pages: adds a note; earlier notes stay. */
  @Version(VERSION_NEUTRAL)
  @Post('notes')
  @HttpCode(200)
  @AdminMetaRoles(...ALL_STAFF)
  addNote(@Body() body: any, @GetAdmin() admin: Admin) {
    return this.service.addNote(body, admin);
  }

  @Version(VERSION_NEUTRAL)
  @Get('performance')
  @AdminMetaRoles(...ALL_STAFF)
  performance(@Query() query: any, @GetAdmin() admin: Admin) {
    return this.service.performance(query, admin);
  }

  // The order pages poll these while staff work. Staff in the office share one
  // internet address, so they skip the per-address limit (120/min) that the
  // order list itself needs; every route here still requires a staff login.

  /** Today's scores for the whole team (order pages; every staff role). */
  @Version(VERSION_NEUTRAL)
  @SkipThrottle()
  @Get('team-today')
  @AdminMetaRoles(...ALL_STAFF)
  teamToday(@GetAdmin() admin: Admin) {
    return this.service.teamToday(admin);
  }

  /** Who is calling whom: calls of the last 24 hours. */
  @Version(VERSION_NEUTRAL)
  @SkipThrottle()
  @Get('calls')
  @AdminMetaRoles(...ALL_STAFF)
  calls(@GetAdmin() admin: Admin) {
    return this.service.listCalls(admin);
  }

  @Version(VERSION_NEUTRAL)
  @SkipThrottle()
  @Post('calls/start')
  @HttpCode(200)
  @AdminMetaRoles(...ALL_STAFF)
  startCall(@Body() body: any, @GetAdmin() admin: Admin) {
    return this.service.startCall(body, admin);
  }

  @Version(VERSION_NEUTRAL)
  @SkipThrottle()
  @Post('calls/end')
  @HttpCode(200)
  @AdminMetaRoles(...ALL_STAFF)
  endCall(@Body() body: any, @GetAdmin() admin: Admin) {
    return this.service.endCall(body, admin);
  }

  @Version(VERSION_NEUTRAL)
  @Put('points')
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN)
  savePoints(@Body() body: any, @GetAdmin() admin: Admin) {
    return this.service.savePoints(body, admin);
  }
}
