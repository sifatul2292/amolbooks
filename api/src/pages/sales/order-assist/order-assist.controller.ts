import { Body, Controller, HttpCode, Post, UseGuards, Version, VERSION_NEUTRAL } from '@nestjs/common';
import { AdminMetaRoles } from '../../../decorator/admin-roles.decorator';
import { AdminRoles } from '../../../enum/admin-roles.enum';
import { AdminJwtAuthGuard } from '../../../guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from '../../../guards/admin-roles.guard';
import { OrderAssistService } from './order-assist.service';

/** AI Assist on the Orders page: { text } → phone, name, address, books, payment. */
@Controller('order-assist')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
export class OrderAssistController {
  constructor(private readonly service: OrderAssistService) {}

  @Version(VERSION_NEUTRAL)
  @Post('parse')
  @HttpCode(200)
  @AdminMetaRoles(...Object.values(AdminRoles))
  parse(@Body() body: any) {
    return this.service.parse(body);
  }
}
