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
  AddDivisionDto,
  FilterAndPaginationDivisionDto,
  OptionDivisionDto,
  UpdateDivisionDto,
} from '../../../dto/division.dto';
import { DivisionService } from './division.service';

@Controller('division')
export class DivisionController {
  private logger = new Logger(DivisionController.name);

  constructor(private divisionService: DivisionService) {}

  /**
   * Division Service Methods
   * addDivision() -> /add
   * insertManyDivision() -> /insert-many
   * getAllDivisions() -> /get-all
   * getDivisionById() -> /:id
   * updateDivisionById() -> /update/:id
   * updateMultipleDivisionById() -> /update-multiple
   * deleteDivisionById() -> /delete/:id
   * deleteMultipleDivisionById() -> /delete-multiple
   */

  @Post('/add')
  @UsePipes(ValidationPipe)
    @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN, AdminRoles.EDITOR)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async addDivision(
    @Body()
    addDivisionDto: AddDivisionDto,
  ): Promise<ResponsePayload> {
    // console.log('addDivisionDto', addDivisionDto);
    return await this.divisionService.addDivision(addDivisionDto);
  }

  @Post('/insert-many')
  @UsePipes(ValidationPipe)
    @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN, AdminRoles.EDITOR)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async insertManyDivision(
    @Body()
    body: {
      data: AddDivisionDto[];
      option: OptionDivisionDto;
    },
  ): Promise<ResponsePayload> {
    return await this.divisionService.insertManyDivision(
      body.data,
      body.option,
    );
  }

  @Version(VERSION_NEUTRAL)
  @Post('/get-all')
  @UsePipes(ValidationPipe)
  async getAllDivisions(
    @Body() filterDivisionDto: FilterAndPaginationDivisionDto,
    @Query('q') searchString: string,
  ): Promise<ResponsePayload> {
    return this.divisionService.getAllDivisions(
      filterDivisionDto,
      searchString,
    );
  }

  @Version(VERSION_NEUTRAL)
  @Get('/:id')
    @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN, AdminRoles.EDITOR)
  @UseGuards(AdminRolesGuard)
  @UseGuards(AdminJwtAuthGuard)
  async getDivisionById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query() select: string,
  ): Promise<ResponsePayload> {
    return await this.divisionService.getDivisionById(id, select);
  }

  @Version(VERSION_NEUTRAL)
  @Put('/update/:id')
  @UsePipes(ValidationPipe)
    @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN, AdminRoles.EDITOR)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async updateDivisionById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() updateDivisionDto: UpdateDivisionDto,
  ): Promise<ResponsePayload> {
    return await this.divisionService.updateDivisionById(id, updateDivisionDto);
  }

  @Version(VERSION_NEUTRAL)
  @Put('/update-multiple')
  @UsePipes(ValidationPipe)
    @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN, AdminRoles.EDITOR)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async updateMultipleDivisionById(
    @Body() updateDivisionDto: UpdateDivisionDto,
  ): Promise<ResponsePayload> {
    return await this.divisionService.updateMultipleDivisionById(
      updateDivisionDto.ids,
      updateDivisionDto,
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
  async deleteDivisionById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.divisionService.deleteDivisionById(
      id,
      Boolean(checkUsage),
    );
  }

  @Version(VERSION_NEUTRAL)
  @Post('/delete-multiple')
  @UsePipes(ValidationPipe)
    @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN, AdminRoles.EDITOR)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.DELETE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async deleteMultipleDivisionById(
    @Body() data: { ids: string[] },
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.divisionService.deleteMultipleDivisionById(
      data.ids,
      Boolean(checkUsage),
    );
  }
}
