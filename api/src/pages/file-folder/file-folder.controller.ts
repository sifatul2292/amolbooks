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
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { MongoIdValidationPipe } from '../../pipes/mongo-id-validation.pipe';
import { FileFolderService } from './file-folder.service';
import {
  AddFileFolderDto,
  FilterAndPaginationFileFolderDto,
  OptionFileFolderDto,
  UpdateFileFolderDto,
} from '../../dto/file-folder.dto';

@Controller('file-folder')
export class FileFolderController {
  private logger = new Logger(FileFolderController.name);

  constructor(private fileFolderService: FileFolderService) {}

  /**
   * addFileFolder
   * insertManyFileFolder
   */
  @Post('/add')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(
    AdminRoles.SUPER_ADMIN,
    AdminRoles.ADMIN,
    AdminRoles.ACCOUNTANT,
  )
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async addFileFolder(
    @Body()
    addFileFolderDto: AddFileFolderDto,
  ): Promise<ResponsePayload> {
    return await this.fileFolderService.addFileFolder(addFileFolderDto);
  }

  @Post('/insert-many')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async insertManyFileFolder(
    @Body()
    body: {
      data: AddFileFolderDto[];
      option: OptionFileFolderDto;
    },
  ): Promise<ResponsePayload> {
    return await this.fileFolderService.insertManyFileFolder(
      body.data,
      body.option,
    );
  }

  /**
   * getAllFileFolders
   * getFileFolderById
   */
  @Version(VERSION_NEUTRAL)
  @Post('/all-file-folders')
  @UsePipes(ValidationPipe)
  async getAllFileFolders(
    @Body() filterFileFolderDto: FilterAndPaginationFileFolderDto,
    @Query('q') searchString: string,
  ): Promise<ResponsePayload> {
    return this.fileFolderService.getAllFileFolders(
      filterFileFolderDto,
      searchString,
    );
  }

  @Version(VERSION_NEUTRAL)
  @Post('/get-all')
  @UsePipes(ValidationPipe)
  async getAllFileFoldersByAdmin(
    @Body() filterFileFolderDto: FilterAndPaginationFileFolderDto,
    @Query('q') searchString: string,
  ): Promise<ResponsePayload> {
    return this.fileFolderService.getAllFileFolders(
      filterFileFolderDto,
      searchString,
    );
  }

  @Version(VERSION_NEUTRAL)
  @Get('/:id')
  @AdminMetaRoles(
    AdminRoles.SUPER_ADMIN,
    AdminRoles.ADMIN,
    AdminRoles.ACCOUNTANT,
  )
  @UseGuards(AdminRolesGuard)
  @UseGuards(AdminJwtAuthGuard)
  async getFileFolderById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query() select: string,
  ): Promise<ResponsePayload> {
    return await this.fileFolderService.getFileFolderById(id, select);
  }

  /**
   * updateFileFolderById
   * updateMultipleFileFolderById
   */
  @Version(VERSION_NEUTRAL)
  @Put('/update-file-folder/:id')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(
    AdminRoles.SUPER_ADMIN,
    AdminRoles.ADMIN,
    AdminRoles.ACCOUNTANT,
  )
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async updateFileFolderById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() updateFileFolderDto: UpdateFileFolderDto,
  ): Promise<ResponsePayload> {
    return await this.fileFolderService.updateFileFolderById(
      id,
      updateFileFolderDto,
    );
  }

  @Version(VERSION_NEUTRAL)
  @Put('/update-multiple-file-folder-by-id')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(
    AdminRoles.SUPER_ADMIN,
    AdminRoles.ADMIN,
    AdminRoles.ACCOUNTANT,
  )
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async updateMultipleFileFolderById(
    @Body() updateFileFolderDto: UpdateFileFolderDto,
  ): Promise<ResponsePayload> {
    return await this.fileFolderService.updateMultipleFileFolderById(
      updateFileFolderDto.ids,
      updateFileFolderDto,
    );
  }

  /**
   * deleteFileFolderById
   * deleteMultipleFileFolderById
   */
  @Version(VERSION_NEUTRAL)
  @Delete('/delete-file-folder/:id')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(
    AdminRoles.SUPER_ADMIN,
    AdminRoles.ADMIN,
    AdminRoles.ACCOUNTANT,
  )
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.DELETE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async deleteFileFolderById(
    @Param('id', MongoIdValidationPipe) id: string,
  ): Promise<ResponsePayload> {
    return await this.fileFolderService.deleteFileFolderById(id);
  }

  @Version(VERSION_NEUTRAL)
  @Post('/delete-multiple-file-folder-by-id')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(
    AdminRoles.SUPER_ADMIN,
    AdminRoles.ADMIN,
    AdminRoles.ACCOUNTANT,
  )
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.DELETE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async deleteMultipleFileFolderById(
    @Body() data: { ids: string[] },
  ): Promise<ResponsePayload> {
    return await this.fileFolderService.deleteMultipleFileFolderById(data.ids);
  }
}
