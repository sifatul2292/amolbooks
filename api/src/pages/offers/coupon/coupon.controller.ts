import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Put,
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
import {
  AddCouponDto,
  CheckCouponDto,
  FilterAndPaginationCouponDto,
  OptionCouponDto,
  UpdateCouponDto,
} from '../../../dto/coupon.dto';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { MongoIdValidationPipe } from '../../../pipes/mongo-id-validation.pipe';
import { CouponService } from './coupon.service';
import { UserJwtAuthGuard } from '../../../guards/user-jwt-auth.guard';
import { GetTokenUser } from '../../../decorator/get-token-user.decorator';
import { User } from '../../../interfaces/user/user.interface';

@Controller('coupon')
export class CouponController {
  private logger = new Logger(CouponController.name);

  constructor(private couponService: CouponService) {}

  /**
   * addCoupon
   * insertManyCoupon
   */
  @Post('/add')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async addCoupon(
    @Body()
    addCouponDto: AddCouponDto,
  ): Promise<ResponsePayload> {
    return await this.couponService.addCoupon(addCouponDto);
  }

  @Post('/insert-many')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async insertManyCoupon(
    @Body()
    body: {
      data: AddCouponDto[];
      option: OptionCouponDto;
    },
  ): Promise<ResponsePayload> {
    return await this.couponService.insertManyCoupon(body.data, body.option);
  }

  /**
   * getAllCoupons
   * getCouponById
   */
  @Version(VERSION_NEUTRAL)
  @Post('/get-all')
  @UsePipes(ValidationPipe)
  async getAllCoupons(
    @Body() filterCouponDto: FilterAndPaginationCouponDto,
    @Query('q') searchString: string,
  ): Promise<ResponsePayload> {
    return this.couponService.getAllCoupons(filterCouponDto, searchString);
  }

  @Version(VERSION_NEUTRAL)
  @Get('/get-all-basic')
  async getAllCouponsBasic(): Promise<ResponsePayload> {
    return await this.couponService.getAllCouponsBasic();
  }

  @Version(VERSION_NEUTRAL)
  @Get('/:id')
  async getCouponById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query() select: string,
  ): Promise<ResponsePayload> {
    return await this.couponService.getCouponById(id, select);
  }

  /**
   * updateCouponById
   * updateMultipleCouponById
   */
  @Version(VERSION_NEUTRAL)
  @Put('/update/:id')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async updateCouponById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() updateCouponDto: UpdateCouponDto,
  ): Promise<ResponsePayload> {
    return await this.couponService.updateCouponById(id, updateCouponDto);
  }

  @Version(VERSION_NEUTRAL)
  @Put('/update-multiple')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async updateMultipleCouponById(
    @Body() updateCouponDto: UpdateCouponDto,
  ): Promise<ResponsePayload> {
    return await this.couponService.updateMultipleCouponById(
      updateCouponDto.ids,
      updateCouponDto,
    );
  }

  /**
   * deleteCouponById
   * deleteMultipleCouponById
   */
  @Version(VERSION_NEUTRAL)
  @Delete('/delete/:id')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.DELETE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async deleteCouponById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.couponService.deleteCouponById(id, Boolean(checkUsage));
  }

  @Version(VERSION_NEUTRAL)
  @Post('/delete-multiple')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.DELETE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async deleteMultipleCouponById(
    @Body() data: { ids: string[] },
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.couponService.deleteMultipleCouponById(
      data.ids,
      Boolean(checkUsage),
    );
  }

  @Post('/check-coupon-availability')
  @UsePipes(ValidationPipe)
  @UseGuards(UserJwtAuthGuard)
  async checkCouponAvailability(
    @GetTokenUser() user: User,
    @Body() checkCouponDto: CheckCouponDto,
  ): Promise<ResponsePayload> {
    return await this.couponService.checkCouponAvailability(
      user,
      checkCouponDto,
    );
  }

  @Post('/check-coupon-availability-anonymous')
  @UsePipes(ValidationPipe)
  async checkCouponAnonymousAvailability(
    @Body() checkCouponDto: CheckCouponDto,
  ): Promise<ResponsePayload> {
    return await this.couponService.checkCouponAnonymousAvailability(
      checkCouponDto,
    );
  }
}
