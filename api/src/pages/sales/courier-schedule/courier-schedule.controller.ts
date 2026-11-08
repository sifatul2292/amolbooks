import { Body, Controller, HttpCode, Post, UseGuards, Version, VERSION_NEUTRAL } from '@nestjs/common';
import { AdminMetaRoles } from '../../../decorator/admin-roles.decorator';
import { GetAdmin } from '../../../decorator/get-admin.decorator';
import { AdminRoles } from '../../../enum/admin-roles.enum';
import { AdminJwtAuthGuard } from '../../../guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from '../../../guards/admin-roles.guard';
import { Admin } from '../../../interfaces/admin/admin.interface';
import { CourierScheduleService } from './courier-schedule.service';

const ALL_STAFF = Object.values(AdminRoles);

/** Future delivery on the Orders page: every staff role that can send to the courier. */
@Controller('courier-schedule')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
export class CourierScheduleController {
  constructor(private readonly service: CourierScheduleService) {}

  /** { ids: [...], at: ISO date } */
  @Version(VERSION_NEUTRAL)
  @Post('set')
  @HttpCode(200)
  @AdminMetaRoles(...ALL_STAFF)
  schedule(@Body() body: any, @GetAdmin() admin: Admin) {
    return this.service.schedule(body, admin);
  }

  /** { ids: [...] } */
  @Version(VERSION_NEUTRAL)
  @Post('cancel')
  @HttpCode(200)
  @AdminMetaRoles(...ALL_STAFF)
  cancel(@Body() body: any) {
    return this.service.cancel(body);
  }

  /** { id } */
  @Version(VERSION_NEUTRAL)
  @Post('send-now')
  @HttpCode(200)
  @AdminMetaRoles(...ALL_STAFF)
  sendNow(@Body() body: any, @GetAdmin() admin: Admin) {
    return this.service.sendNow(body, admin);
  }
}
