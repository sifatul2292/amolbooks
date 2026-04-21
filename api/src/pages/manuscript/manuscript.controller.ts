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
  AddManuscriptDto,
  FilterAndPaginationManuscriptDto,
  OptionManuscriptDto,
  UpdateManuscriptDto,
} from '../../dto/manuscript.dto';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { MongoIdValidationPipe } from '../../pipes/mongo-id-validation.pipe';
import { ManuscriptService } from './manuscript.service';

@Controller('manuscript')
export class ManuscriptController {
  private logger = new Logger(ManuscriptController.name);

  constructor(private manuscriptService: ManuscriptService) {}

  /**
   * addManuscript
   * insertManyManuscript
   */
  @Post('/add')
  // @UsePipes(ValidationPipe)
  // @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  // @UseGuards(AdminRolesGuard)
  // @AdminMetaPermissions(AdminPermissions.CREATE)
  // @UseGuards(AdminPermissionGuard)
  // @UseGuards(AdminJwtAuthGuard)
  async addManuscript(
    @Body()
    addManuscriptDto: AddManuscriptDto,
  ): Promise<ResponsePayload> {
    return await this.manuscriptService.addManuscript(addManuscriptDto);
  }

  @Post('/insert-many')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async insertManyManuscript(
    @Body()
    body: {
      data: AddManuscriptDto[];
      option: OptionManuscriptDto;
    },
  ): Promise<ResponsePayload> {
    return await this.manuscriptService.insertManyManuscript(body.data, body.option);
  }

  /**
   * getAllManuscripts
   * getManuscriptById
   */
  @Version(VERSION_NEUTRAL)
  @Post('/get-all')
  @UsePipes(ValidationPipe)
  async getAllManuscripts(
    @Body() filterManuscriptDto: FilterAndPaginationManuscriptDto,
    @Query('q') searchString: string,
  ): Promise<ResponsePayload> {
    return this.manuscriptService.getAllManuscripts(filterManuscriptDto, searchString);
  }

  @Version(VERSION_NEUTRAL)
  @Get('/get-all-basic')
  async getAllManuscriptsBasic(): Promise<ResponsePayload> {
    return await this.manuscriptService.getAllManuscriptsBasic();
  }

  @Version(VERSION_NEUTRAL)
  @Get('/:id')
  async getManuscriptById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query() select: string,
  ): Promise<ResponsePayload> {
    return await this.manuscriptService.getManuscriptById(id, select);
  }

  /**
   * updateManuscriptById
   * updateMultipleManuscriptById
   */
  @Version(VERSION_NEUTRAL)
  @Put('/update/:id')
  // @UsePipes(ValidationPipe)
  // @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  // @UseGuards(AdminRolesGuard)
  // @AdminMetaPermissions(AdminPermissions.EDIT)
  // @UseGuards(AdminPermissionGuard)
  // @UseGuards(AdminJwtAuthGuard)
  async updateManuscriptById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() updateManuscriptDto: UpdateManuscriptDto,
  ): Promise<ResponsePayload> {
    return await this.manuscriptService.updateManuscriptById(id, updateManuscriptDto);
  }

  @Version(VERSION_NEUTRAL)
  @Put('/update-multiple')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async updateMultipleManuscriptById(
    @Body() updateManuscriptDto: UpdateManuscriptDto,
  ): Promise<ResponsePayload> {
    return await this.manuscriptService.updateMultipleManuscriptById(
      updateManuscriptDto.ids,
      updateManuscriptDto,
    );
  }

  /**
   * deleteManuscriptById
   * deleteMultipleManuscriptById
   */
  @Version(VERSION_NEUTRAL)
  @Delete('/delete/:id')
  // @UsePipes(ValidationPipe)
  // @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  // @UseGuards(AdminRolesGuard)
  // @AdminMetaPermissions(AdminPermissions.DELETE)
  // @UseGuards(AdminPermissionGuard)
  // @UseGuards(AdminJwtAuthGuard)
  async deleteManuscriptById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.manuscriptService.deleteManuscriptById(id, Boolean(checkUsage));
  }

  @Version(VERSION_NEUTRAL)
  @Post('/delete-multiple')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.DELETE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async deleteMultipleManuscriptById(
    @Body() data: { ids: string[] },
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.manuscriptService.deleteMultipleManuscriptById(
      data.ids,
      Boolean(checkUsage),
    );
  }
}
