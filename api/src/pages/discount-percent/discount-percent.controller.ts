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
import { AdminMetaRoles } from '../../decorator/admin-roles.decorator';
import { AdminRoles } from '../../enum/admin-roles.enum';
import { AdminRolesGuard } from '../../guards/admin-roles.guard';
import { AdminMetaPermissions } from '../../decorator/admin-permissions.decorator';
import { AdminPermissions } from '../../enum/admin-permission.enum';
import { AdminPermissionGuard } from '../../guards/admin-permission.guard';
import { AdminJwtAuthGuard } from '../../guards/admin-jwt-auth.guard';
import {
  AddDiscountPercentDto,
  FilterAndPaginationDiscountPercentDto,
  OptionDiscountPercentDto,
  UpdateDiscountPercentDto,
} from '../../dto/discount-percent.dto';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { MongoIdValidationPipe } from '../../pipes/mongo-id-validation.pipe';
import { DiscountPercentService } from './discount-percent.service';

@Controller('discount-percent')
export class DiscountPercentController {
  private logger = new Logger(DiscountPercentController.name);

  constructor(private discountPercentService: DiscountPercentService) {}

  /**
   * addDiscountPercent
   * insertManyDiscountPercent
   */
  @Post('/add')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async addDiscountPercent(
    @Body()
    addDiscountPercentDto: AddDiscountPercentDto,
  ): Promise<ResponsePayload> {
    return await this.discountPercentService.addDiscountPercent(addDiscountPercentDto);
  }

  @Post('/insert-many')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async insertManyDiscountPercent(
    @Body()
    body: {
      data: AddDiscountPercentDto[];
      option: OptionDiscountPercentDto;
    },
  ): Promise<ResponsePayload> {
    return await this.discountPercentService.insertManyDiscountPercent(body.data, body.option);
  }

  /**
   * getAllDiscountPercents
   * getDiscountPercentById
   */
  @Version(VERSION_NEUTRAL)
  @Post('/get-all')
  @UsePipes(ValidationPipe)
  async getAllDiscountPercents(
    @Body() filterDiscountPercentDto: FilterAndPaginationDiscountPercentDto,
    @Query('q') searchString: string,
  ): Promise<ResponsePayload> {
    return this.discountPercentService.getAllDiscountPercents(filterDiscountPercentDto, searchString);
  }

  @Version(VERSION_NEUTRAL)
  @Get('/:id')
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN)
  @UseGuards(AdminRolesGuard)
  @UseGuards(AdminJwtAuthGuard)
  async getDiscountPercentById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query() select: string,
  ): Promise<ResponsePayload> {
    return await this.discountPercentService.getDiscountPercentById(id, select);
  }

  /**
   * updateDiscountPercentById
   * updateMultipleDiscountPercentById
   */
  @Version(VERSION_NEUTRAL)
  @Put('/update/:id')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async updateDiscountPercentById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() updateDiscountPercentDto: UpdateDiscountPercentDto,
  ): Promise<ResponsePayload> {
    return await this.discountPercentService.updateDiscountPercentById(id, updateDiscountPercentDto);
  }

  @Version(VERSION_NEUTRAL)
  @Put('/update-multiple')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async updateMultipleDiscountPercentById(
    @Body() updateDiscountPercentDto: UpdateDiscountPercentDto,
  ): Promise<ResponsePayload> {
    return await this.discountPercentService.updateMultipleDiscountPercentById(
      updateDiscountPercentDto.ids,
      updateDiscountPercentDto,
    );
  }

  /**
   * deleteDiscountPercentById
   * deleteMultipleDiscountPercentById
   */
  @Version(VERSION_NEUTRAL)
  @Delete('/delete/:id')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.DELETE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async deleteDiscountPercentById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.discountPercentService.deleteDiscountPercentById(id, Boolean(checkUsage));
  }

  @Version(VERSION_NEUTRAL)
  @Post('/delete-multiple')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.DELETE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async deleteMultipleDiscountPercentById(
    @Body() data: { ids: string[] },
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.discountPercentService.deleteMultipleDiscountPercentById(
      data.ids,
      Boolean(checkUsage),
    );
  }
}
