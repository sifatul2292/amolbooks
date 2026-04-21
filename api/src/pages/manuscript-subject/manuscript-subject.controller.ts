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
  AddManuscriptSubjectDto,
  FilterAndPaginationManuscriptSubjectDto,
  OptionManuscriptSubjectDto,
  UpdateManuscriptSubjectDto,
} from '../../dto/manuscript-subject.dto';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { MongoIdValidationPipe } from '../../pipes/mongo-id-validation.pipe';
import { ManuscriptSubjectService } from './manuscript-subject.service';

@Controller('manuscriptSubject')
export class ManuscriptSubjectController {
  private logger = new Logger(ManuscriptSubjectController.name);

  constructor(private manuscriptSubjectService: ManuscriptSubjectService) {}

  /**
   * addManuscriptSubject
   * insertManyManuscriptSubject
   */
  @Post('/add')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN, AdminRoles.EDITOR)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async addManuscriptSubject(
    @Body()
    addManuscriptSubjectDto: AddManuscriptSubjectDto,
  ): Promise<ResponsePayload> {
    return await this.manuscriptSubjectService.addManuscriptSubject(
      addManuscriptSubjectDto,
    );
  }

  @Post('/insert-many')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN, AdminRoles.EDITOR)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async insertManyManuscriptSubject(
    @Body()
    body: {
      data: AddManuscriptSubjectDto[];
      option: OptionManuscriptSubjectDto;
    },
  ): Promise<ResponsePayload> {
    return await this.manuscriptSubjectService.insertManyManuscriptSubject(
      body.data,
      body.option,
    );
  }

  /**
   * getAllManuscriptSubjects
   * getManuscriptSubjectById
   */
  @Version(VERSION_NEUTRAL)
  @Post('/get-all')
  @UsePipes(ValidationPipe)
  async getAllManuscriptSubjects(
    @Body() filterManuscriptSubjectDto: FilterAndPaginationManuscriptSubjectDto,
    @Query('q') searchString: string,
  ): Promise<ResponsePayload> {
    return this.manuscriptSubjectService.getAllManuscriptSubjects(
      filterManuscriptSubjectDto,
      searchString,
    );
  }

  @Version(VERSION_NEUTRAL)
  @Get('/:id')
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN, AdminRoles.EDITOR)
  @UseGuards(AdminRolesGuard)
  @UseGuards(AdminJwtAuthGuard)
  async getManuscriptSubjectById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query() select: string,
  ): Promise<ResponsePayload> {
    return await this.manuscriptSubjectService.getManuscriptSubjectById(
      id,
      select,
    );
  }

  /**
   * updateManuscriptSubjectById
   * updateMultipleManuscriptSubjectById
   */
  @Version(VERSION_NEUTRAL)
  @Put('/update/:id')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN, AdminRoles.EDITOR)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async updateManuscriptSubjectById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() updateManuscriptSubjectDto: UpdateManuscriptSubjectDto,
  ): Promise<ResponsePayload> {
    return await this.manuscriptSubjectService.updateManuscriptSubjectById(
      id,
      updateManuscriptSubjectDto,
    );
  }

  @Version(VERSION_NEUTRAL)
  @Put('/update-multiple')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN, AdminRoles.EDITOR)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async updateMultipleManuscriptSubjectById(
    @Body() updateManuscriptSubjectDto: UpdateManuscriptSubjectDto,
  ): Promise<ResponsePayload> {
    return await this.manuscriptSubjectService.updateMultipleManuscriptSubjectById(
      updateManuscriptSubjectDto.ids,
      updateManuscriptSubjectDto,
    );
  }

  /**
   * deleteManuscriptSubjectById
   * deleteMultipleManuscriptSubjectById
   */
  @Version(VERSION_NEUTRAL)
  @Delete('/delete/:id')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN, AdminRoles.EDITOR)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.DELETE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async deleteManuscriptSubjectById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.manuscriptSubjectService.deleteManuscriptSubjectById(
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
  async deleteMultipleManuscriptSubjectById(
    @Body() data: { ids: string[] },
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.manuscriptSubjectService.deleteMultipleManuscriptSubjectById(
      data.ids,
      Boolean(checkUsage),
    );
  }
}
