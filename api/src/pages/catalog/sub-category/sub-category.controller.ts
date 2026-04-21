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
  AddSubCategoryDto,
  FilterAndPaginationSubCategoryDto,
  OptionSubCategoryDto,
  UpdateSubCategoryDto,
} from '../../../dto/sub-category.dto';
import { SubCategoryService } from './sub-category.service';
import { UpdateCategoryDto } from '../../../dto/category.dto';

@Controller('sub-category')
export class SubCategoryController {
  private logger = new Logger(SubCategoryController.name);

  constructor(private subCategoryService: SubCategoryService) {}

  /**
   * addSubCategory
   * insertManySubCategory
   */
  @Post('/add')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async addSubCategory(
    @Body()
    addSubCategoryDto: AddSubCategoryDto,
  ): Promise<ResponsePayload> {
    return await this.subCategoryService.addSubCategory(addSubCategoryDto);
  }

  @Post('/insert-many')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async insertManySubCategory(
    @Body()
    body: {
      data: AddSubCategoryDto[];
      option: OptionSubCategoryDto;
    },
  ): Promise<ResponsePayload> {
    return await this.subCategoryService.insertManySubCategory(
      body.data,
      body.option,
    );
  }

  /**
   * getAllSubCategories
   * getSubCategoryById
   * changeMultipleSubCategoryStatus()
   */
  @Version(VERSION_NEUTRAL)
  @Post('/get-all')
  @UsePipes(ValidationPipe)
  async getAllSubCategories(
    @Body() filterSubCategoryDto: FilterAndPaginationSubCategoryDto,
    @Query('q') searchString: string,
  ): Promise<ResponsePayload> {
    return this.subCategoryService.getAllSubCategories(
      filterSubCategoryDto,
      searchString,
    );
  }

  @Version(VERSION_NEUTRAL)
  @Get('/get-subcategories-group-by-category')
  @UsePipes(ValidationPipe)
  async getSubCategoriesGroupByCategory(): Promise<ResponsePayload> {
    return this.subCategoryService.getSubCategoriesGroupByCategory();
  }

  @Version(VERSION_NEUTRAL)
  @Get('/:id')
  // @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN)
  // @UseGuards(AdminRolesGuard)
  // @UseGuards(AdminJwtAuthGuard)
  async getSubCategoryById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query() select: string,
  ): Promise<ResponsePayload> {
    return await this.subCategoryService.getSubCategoryById(id, select);
  }

  @Version(VERSION_NEUTRAL)
  @Get('/get-all-by-parent/:id')
  // @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN)
  // @UseGuards(AdminRolesGuard)
  // @UseGuards(AdminJwtAuthGuard)
  async getSubCategoriesByCategoryId(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query('select') select: string,
  ): Promise<ResponsePayload> {
    return await this.subCategoryService.getSubCategoriesByCategoryId(
      id,
      select,
    );
  }

  /**
   * updateSubCategoryById()
   * updateMultipleSubCategoryById()
   * changeMultipleSubCategoryStatus()
   */
  @Version(VERSION_NEUTRAL)
  @Put('/update/:id')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async updateSubCategoryById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() updateSubCategoryDto: UpdateSubCategoryDto,
  ): Promise<ResponsePayload> {
    return await this.subCategoryService.updateSubCategoryById(
      id,
      updateSubCategoryDto,
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
  async updateMultipleSubCategoryById(
    @Body() updateSubCategoryDto: UpdateSubCategoryDto,
  ): Promise<ResponsePayload> {
    return await this.subCategoryService.updateMultipleSubCategoryById(
      updateSubCategoryDto.ids,
      updateSubCategoryDto,
    );
  }

  @Version(VERSION_NEUTRAL)
  @Put('/change-multiple-sub-category-status')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async changeMultipleSubCategoryStatus(
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<ResponsePayload> {
    return await this.subCategoryService.changeMultipleSubCategoryStatus(
      updateCategoryDto.ids,
      updateCategoryDto,
    );
  }

  /**
   * deleteSubCategoryById
   * deleteMultipleSubCategoryById
   */
  @Version(VERSION_NEUTRAL)
  @Delete('/delete/:id')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.DELETE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async deleteSubCategoryById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.subCategoryService.deleteSubCategoryById(
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
  async deleteMultipleSubCategoryById(
    @Body() data: { ids: string[] },
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.subCategoryService.deleteMultipleSubCategoryById(
      data.ids,
      Boolean(checkUsage),
    );
  }
}
