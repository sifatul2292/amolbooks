import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Version,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { AdminMetaRoles } from '../../../decorator/admin-roles.decorator';
import { AdminRoles } from '../../../enum/admin-roles.enum';
import { AdminRolesGuard } from '../../../guards/admin-roles.guard';
import { AdminMetaPermissions } from '../../../decorator/admin-permissions.decorator';
import { AdminPermissions } from '../../../enum/admin-permission.enum';
import { AdminPermissionGuard } from '../../../guards/admin-permission.guard';
import { AdminJwtAuthGuard } from '../../../guards/admin-jwt-auth.guard';
import { AddShippingChargeDto } from '../../../dto/shipping-charge.dto';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { ShippingChargeService } from './shipping-charge.service';

@Controller('shipping-charge')
export class ShippingChargeController {
  private logger = new Logger(ShippingChargeController.name);

  constructor(private shippingChargeService: ShippingChargeService) {}

  /**
   * addShippingCharge
   * insertManyShippingCharge
   */
  @Post('/add')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async addShippingCharge(
    @Body()
    addShippingChargeDto: AddShippingChargeDto,
  ): Promise<ResponsePayload> {
    return await this.shippingChargeService.addShippingCharge(
      addShippingChargeDto,
    );
  }

  @Version(VERSION_NEUTRAL)
  @Get('/get')
  async getShippingCharge(@Query() select: string): Promise<ResponsePayload> {
    return await this.shippingChargeService.getShippingCharge(select);
  }
}
