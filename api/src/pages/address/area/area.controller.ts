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
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { MongoIdValidationPipe } from '../../../pipes/mongo-id-validation.pipe';
import {
  AddAreaDto,
  FilterAndPaginationAreaDto,
  OptionAreaDto,
  UpdateAreaDto,
} from '../../../dto/area.dto';
import { AreaService } from './area.service';

@Controller('area')
export class AreaController {
  private logger = new Logger(AreaController.name);

  constructor(private areaService: AreaService) {}

  /**
   * Area Service Methods
   * addArea() -> /add
   * insertManyArea() -> /insert-many
   * getAllAreas() -> /get-all
   * getAreaByParentId() -> /get-all-by-parent/:id
   * getAreaById() -> /:id
   * updateAreaById() -> /update/:id
   * updateMultipleAreaById() -> /update-multiple
   * deleteAreaById() -> /delete/:id
   * deleteMultipleAreaById() -> /delete-multiple
   */

  @Post('/add')
  @UsePipes(ValidationPipe)
    @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN, AdminRoles.EDITOR)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async addArea(
    @Body()
    addAreaDto: AddAreaDto,
  ): Promise<ResponsePayload> {
    // console.log('addAreaDto', addAreaDto);
    return await this.areaService.addArea(addAreaDto);
  }

  @Post('/insert-many')
  @UsePipes(ValidationPipe)
    @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN, AdminRoles.EDITOR)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async insertManyArea(
    @Body()
    body: {
      data: AddAreaDto[];
      option: OptionAreaDto;
    },
  ): Promise<ResponsePayload> {
    return await this.areaService.insertManyArea(body.data, body.option);
  }

  @Version(VERSION_NEUTRAL)
  @Post('/get-all')
  @UsePipes(ValidationPipe)
  async getAllAreas(
    @Body() filterAreaDto: FilterAndPaginationAreaDto,
    @Query('q') searchString: string,
  ): Promise<ResponsePayload> {
    return this.areaService.getAllAreas(filterAreaDto, searchString);
  }

  @Version(VERSION_NEUTRAL)
  @Get('/get-all-by-parent/:id')
  async getAreaByParentId(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query('select') select: string,
  ): Promise<ResponsePayload> {
    return await this.areaService.getAreaByParentId(id, select);
  }

  @Version(VERSION_NEUTRAL)
  @Get('/:id')
    @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN, AdminRoles.EDITOR)
  @UseGuards(AdminRolesGuard)
  @UseGuards(AdminJwtAuthGuard)
  async getAreaById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query() select: string,
  ): Promise<ResponsePayload> {
    return await this.areaService.getAreaById(id, select);
  }

  @Version(VERSION_NEUTRAL)
  @Put('/update/:id')
  @UsePipes(ValidationPipe)
    @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN, AdminRoles.EDITOR)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async updateAreaById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() updateAreaDto: UpdateAreaDto,
  ): Promise<ResponsePayload> {
    return await this.areaService.updateAreaById(id, updateAreaDto);
  }

  @Version(VERSION_NEUTRAL)
  @Put('/update-multiple')
  @UsePipes(ValidationPipe)
    @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN, AdminRoles.EDITOR)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async updateMultipleAreaById(
    @Body() updateAreaDto: UpdateAreaDto,
  ): Promise<ResponsePayload> {
    return await this.areaService.updateMultipleAreaById(
      updateAreaDto.ids,
      updateAreaDto,
    );
  }

  @Version(VERSION_NEUTRAL)
  @Delete('/delete/:id')
  @UsePipes(ValidationPipe)
    @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN, AdminRoles.EDITOR)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.DELETE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async deleteAreaById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.areaService.deleteAreaById(id, Boolean(checkUsage));
  }

  @Version(VERSION_NEUTRAL)
  @Post('/delete-multiple')
  @UsePipes(ValidationPipe)
    @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN, AdminRoles.EDITOR)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.DELETE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async deleteMultipleAreaById(
    @Body() data: { ids: string[] },
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.areaService.deleteMultipleAreaById(
      data.ids,
      Boolean(checkUsage),
    );
  }
}
