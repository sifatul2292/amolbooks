import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  Version,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { AdminMetaRoles } from '../../decorator/admin-roles.decorator';
import { AdminRoles } from '../../enum/admin-roles.enum';
import { AdminJwtAuthGuard } from '../../guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from '../../guards/admin-roles.guard';
import { CustomerManagerService } from './customer-manager.service';

@Controller('customer-manager')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
export class CustomerManagerController {
  constructor(private readonly service: CustomerManagerService) {}

  @Version(VERSION_NEUTRAL)
  @Get()
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN, AdminRoles.SALESMAN)
  list(@Query() query: any) {
    return this.service.list(query);
  }

  @Version(VERSION_NEUTRAL)
  @Get(':phone')
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN, AdminRoles.SALESMAN)
  detail(@Param('phone') phone: string) {
    return this.service.detail(phone);
  }

  @Version(VERSION_NEUTRAL)
  @Post(':phone/contacts')
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN, AdminRoles.SALESMAN)
  save(@Param('phone') phone: string, @Body() body: any, @Req() request: any) {
    return this.service.save(phone, body, request.user || request.admin);
  }
}
