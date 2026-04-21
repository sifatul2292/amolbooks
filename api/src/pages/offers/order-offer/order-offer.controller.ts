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
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { OrderOfferService } from './order-offer.service';
import { UserJwtAuthGuard } from '../../../guards/user-jwt-auth.guard';
import { GetTokenUser } from '../../../decorator/get-token-user.decorator';
import { User } from '../../../interfaces/user/user.interface';
import { AddOrderOfferDto } from '../../../dto/order-offer.dto';

@Controller('order-offer')
export class OrderOfferController {
  private logger = new Logger(OrderOfferController.name);

  constructor(private orderOfferService: OrderOfferService) {}

  /**
   * addOrderOffer
   * insertManyOrderOffer
   */
  @Post('/add')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN, AdminRoles.EDITOR)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async addOrderOffer(
    @Body()
    addOrderOfferDto: AddOrderOfferDto,
  ): Promise<ResponsePayload> {
    return await this.orderOfferService.addOrderOffer(addOrderOfferDto);
  }

  @Version(VERSION_NEUTRAL)
  @Get('/get')
  async getOrderOffer(
    @Query('select') select: string,
  ): Promise<ResponsePayload> {
    return await this.orderOfferService.getOrderOffer(select);
  }

  @Version(VERSION_NEUTRAL)
  @Get('/get-by-user')
  @UsePipes(ValidationPipe)
  @UseGuards(UserJwtAuthGuard)
  async getOrderOfferWithUser(
    @GetTokenUser() user: User,
    @Query() select: string,
  ): Promise<ResponsePayload> {
    return await this.orderOfferService.getOrderOfferWithUser(user, select);
  }
}
