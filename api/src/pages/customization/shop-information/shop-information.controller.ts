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
  AddShopInformationDto,
  FilterAndPaginationShopInformationDto,
  OptionShopInformationDto,
  UpdateShopInformationDto,
} from '../../../dto/shop-information.dto';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { MongoIdValidationPipe } from '../../../pipes/mongo-id-validation.pipe';
import { ShopInformationService } from './shop-information.service';

@Controller('shop-information')
export class ShopInformationController {
  private logger = new Logger(ShopInformationController.name);

  constructor(private shopInformationService: ShopInformationService) {}

  /**
   * ADD
   * addShopInformation()
   * insertManyShopInformation()
   */
  @Post('/add')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async addShopInformation(
    @Body()
    addShopInformationDto: AddShopInformationDto,
  ): Promise<ResponsePayload> {
    return await this.shopInformationService.addShopInformation(
      addShopInformationDto,
    );
  }


  @Post('/insert-many')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async insertManyShopInformation(
    @Body()
    body: {
      data: AddShopInformationDto[];
      option: OptionShopInformationDto;
    },
  ): Promise<ResponsePayload> {
    return await this.shopInformationService.insertManyShopInformation(
      body.data,
      body.option,
    );
  }

  /**
   * GET
   * getShopInformation()
   * getAllShopInformations()
   * getShopInformationById()
   * getShopInformationById()
   */

  @Version(VERSION_NEUTRAL)
  @Get('/get')
  async getShopInformation(@Query() select: string): Promise<ResponsePayload> {
    return await this.shopInformationService.getShopInformation(select);
  }


  @Version(VERSION_NEUTRAL)
  @Post('/get-all')
  @UsePipes(ValidationPipe)
  async getAllShopInformations(
    @Body() filterShopInformationDto: FilterAndPaginationShopInformationDto,
    @Query('q') searchString: string,
  ): Promise<ResponsePayload> {
    return this.shopInformationService.getAllShopInformations(
      filterShopInformationDto,
      searchString,
    );
  }

  @Version(VERSION_NEUTRAL)
  @Get('/get-all-basic')
  async getAllShopInformationsBasic(): Promise<ResponsePayload> {
    return await this.shopInformationService.getAllShopInformationsBasic();
  }

  @Version(VERSION_NEUTRAL)
  @Get('/:id')
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN)
  @UseGuards(AdminRolesGuard)
  @UseGuards(AdminJwtAuthGuard)
  async getShopInformationById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query() select: string,
  ): Promise<ResponsePayload> {
    return await this.shopInformationService.getShopInformationById(id, select);
  }

  /**
   * UPDATE
   * updateShopInformationById()
   * updateMultipleShopInformationById()
   */
  @Version(VERSION_NEUTRAL)
  @Put('/update/:id')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async updateShopInformationById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() updateShopInformationDto: UpdateShopInformationDto,
  ): Promise<ResponsePayload> {
    return await this.shopInformationService.updateShopInformationById(
      id,
      updateShopInformationDto,
    );
  }

  @Version(VERSION_NEUTRAL)
  @Put('/update-multiple')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async updateMultipleShopInformationById(
    @Body() updateShopInformationDto: UpdateShopInformationDto,
  ): Promise<ResponsePayload> {
    return await this.shopInformationService.updateMultipleShopInformationById(
      updateShopInformationDto.ids,
      updateShopInformationDto,
    );
  }

  /**
   * DELETE
   * deleteShopInformationById()
   * deleteMultipleShopInformationById()
   */
  @Version(VERSION_NEUTRAL)
  @Delete('/delete/:id')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.DELETE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async deleteShopInformationById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.shopInformationService.deleteShopInformationById(
      id,
      Boolean(checkUsage),
    );
  }

  @Version(VERSION_NEUTRAL)
  @Post('/delete-multiple')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.DELETE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async deleteMultipleShopInformationById(
    @Body() data: { ids: string[] },
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.shopInformationService.deleteMultipleShopInformationById(
      data.ids,
      Boolean(checkUsage),
    );
  }
}
