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
  AddZoneDto,
  FilterAndPaginationZoneDto,
  OptionZoneDto,
  UpdateZoneDto,
} from '../../../dto/zone.dto';
import { ZoneService } from './zone.service';

@Controller('zone')
export class ZoneController {
  private logger = new Logger(ZoneController.name);

  constructor(private zoneService: ZoneService) {}

  /**
   * Zone Service Methods
   * addZone() -> /add
   * insertManyZone() -> /insert-many
   * getAllZones() -> /get-all
   * getZoneByParentId() -> /get-all-by-parent/:id
   * getZoneById() -> /:id
   * updateZoneById() -> /update/:id
   * updateMultipleZoneById() -> /update-multiple
   * deleteZoneById() -> /delete/:id
   * deleteMultipleZoneById() -> /delete-multiple
   */

  @Post('/add')
  @UsePipes(ValidationPipe)
    @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN, AdminRoles.EDITOR)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async addZone(
    @Body()
    addZoneDto: AddZoneDto,
  ): Promise<ResponsePayload> {
    // console.log('addZoneDto', addZoneDto);
    return await this.zoneService.addZone(addZoneDto);
  }

  @Post('/insert-many')
  @UsePipes(ValidationPipe)
    @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN, AdminRoles.EDITOR)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async insertManyZone(
    @Body()
    body: {
      data: AddZoneDto[];
      option: OptionZoneDto;
    },
  ): Promise<ResponsePayload> {
    return await this.zoneService.insertManyZone(body.data, body.option);
  }

  @Version(VERSION_NEUTRAL)
  @Post('/get-all')
  @UsePipes(ValidationPipe)
  async getAllZones(
    @Body() filterZoneDto: FilterAndPaginationZoneDto,
    @Query('q') searchString: string,
  ): Promise<ResponsePayload> {
    return this.zoneService.getAllZones(filterZoneDto, searchString);
  }

  @Version(VERSION_NEUTRAL)
  @Get('/get-all-by-parent/:id')
  async getZoneByParentId(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query('select') select: string,
  ): Promise<ResponsePayload> {
    return await this.zoneService.getZoneByParentId(id, select);
  }

  @Version(VERSION_NEUTRAL)
  @Get('/:id')
    @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN, AdminRoles.EDITOR)
  @UseGuards(AdminRolesGuard)
  @UseGuards(AdminJwtAuthGuard)
  async getZoneById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query() select: string,
  ): Promise<ResponsePayload> {
    return await this.zoneService.getZoneById(id, select);
  }

  @Version(VERSION_NEUTRAL)
  @Put('/update/:id')
  @UsePipes(ValidationPipe)
    @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN, AdminRoles.EDITOR)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async updateZoneById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() updateZoneDto: UpdateZoneDto,
  ): Promise<ResponsePayload> {
    return await this.zoneService.updateZoneById(id, updateZoneDto);
  }

  @Version(VERSION_NEUTRAL)
  @Put('/update-multiple')
  @UsePipes(ValidationPipe)
    @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN, AdminRoles.EDITOR)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async updateMultipleZoneById(
    @Body() updateZoneDto: UpdateZoneDto,
  ): Promise<ResponsePayload> {
    return await this.zoneService.updateMultipleZoneById(
      updateZoneDto.ids,
      updateZoneDto,
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
  async deleteZoneById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.zoneService.deleteZoneById(id, Boolean(checkUsage));
  }

  @Version(VERSION_NEUTRAL)
  @Post('/delete-multiple')
  @UsePipes(ValidationPipe)
    @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN, AdminRoles.EDITOR)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.DELETE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async deleteMultipleZoneById(
    @Body() data: { ids: string[] },
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.zoneService.deleteMultipleZoneById(
      data.ids,
      Boolean(checkUsage),
    );
  }
}
