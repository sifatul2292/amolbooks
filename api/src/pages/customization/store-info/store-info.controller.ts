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
  AddStoreInfoDto,
  FilterAndPaginationStoreInfoDto,
  OptionStoreInfoDto,
  UpdateStoreInfoDto,
} from '../../../dto/store-info.dto';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { MongoIdValidationPipe } from '../../../pipes/mongo-id-validation.pipe';
import { StoreInfoService } from './store-info.service';

@Controller('store-info')
export class StoreInfoController {
  private logger = new Logger(StoreInfoController.name);

  constructor(private storeInfoService: StoreInfoService) {}

  /**
   * ADD
   * addStoreInfo()
   * insertManyStoreInfo()
   */
  @Post('/add')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async addStoreInfo(
    @Body()
    addStoreInfoDto: AddStoreInfoDto,
  ): Promise<ResponsePayload> {
    return await this.storeInfoService.addStoreInfo(addStoreInfoDto);
  }

  @Post('/insert-many')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async insertManyStoreInfo(
    @Body()
    body: {
      data: AddStoreInfoDto[];
      option: OptionStoreInfoDto;
    },
  ): Promise<ResponsePayload> {
    return await this.storeInfoService.insertManyStoreInfo(
      body.data,
      body.option,
    );
  }

  /**
   * GET
   * getAllStoreInfos()
   * getAllStoreInfosBasic()
   * getStoreInfoById()
   */
  @Version(VERSION_NEUTRAL)
  @Post('/get-all')
  @UsePipes(ValidationPipe)
  async getAllStoreInfos(
    @Body() filterStoreInfoDto: FilterAndPaginationStoreInfoDto,
    @Query('q') searchString: string,
  ): Promise<ResponsePayload> {
    return this.storeInfoService.getAllStoreInfos(
      filterStoreInfoDto,
      searchString,
    );
  }

  @Version(VERSION_NEUTRAL)
  @Get('/get-all-basic')
  async getAllStoreInfosBasic(): Promise<ResponsePayload> {
    return await this.storeInfoService.getAllStoreInfosBasic();
  }

  @Version(VERSION_NEUTRAL)
  @Get('/:id')
  async getStoreInfoById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query() select: string,
  ): Promise<ResponsePayload> {
    return await this.storeInfoService.getStoreInfoById(id, select);
  }

  /**
   * UPDATE
   * updateStoreInfoById()
   * updateMultipleStoreInfoById()
   */
  @Version(VERSION_NEUTRAL)
  @Put('/update/:id')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async updateStoreInfoById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() updateStoreInfoDto: UpdateStoreInfoDto,
  ): Promise<ResponsePayload> {
    return await this.storeInfoService.updateStoreInfoById(
      id,
      updateStoreInfoDto,
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
  async updateMultipleStoreInfoById(
    @Body() updateStoreInfoDto: UpdateStoreInfoDto,
  ): Promise<ResponsePayload> {
    return await this.storeInfoService.updateMultipleStoreInfoById(
      updateStoreInfoDto.ids,
      updateStoreInfoDto,
    );
  }

  /**
   * DELETE
   * deleteStoreInfoById()
   * deleteMultipleStoreInfoById()
   */
  @Version(VERSION_NEUTRAL)
  @Delete('/delete/:id')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.DELETE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async deleteStoreInfoById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.storeInfoService.deleteStoreInfoById(id);
  }

  @Version(VERSION_NEUTRAL)
  @Post('/delete-multiple')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.DELETE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async deleteMultipleStoreInfoById(
    @Body() data: { ids: string[] },
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.storeInfoService.deleteMultipleStoreInfoById(data.ids);
  }
}
