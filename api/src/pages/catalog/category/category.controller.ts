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
  AddCategoryDto,
  FilterAndPaginationCategoryDto,
  OptionCategoryDto,
  UpdateCategoryDto,
} from '../../../dto/category.dto';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { MongoIdValidationPipe } from '../../../pipes/mongo-id-validation.pipe';
import { CategoryService } from './category.service';

@Controller('category')
export class CategoryController {
  private logger = new Logger(CategoryController.name);

  constructor(private categoryService: CategoryService) {}

  /**
   * addCategory
   * insertManyCategory
   */
  @Post('/add')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async addCategory(
    @Body()
    addCategoryDto: AddCategoryDto,
  ): Promise<ResponsePayload> {
    return await this.categoryService.addCategory(addCategoryDto);
  }

  @Post('/insert-many')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async insertManyCategory(
    @Body()
    body: {
      data: AddCategoryDto[];
      option: OptionCategoryDto;
    },
  ): Promise<ResponsePayload> {
    return await this.categoryService.insertManyCategory(
      body.data,
      body.option,
    );
  }

  /**
   * getAllCategories
   * getCategoryById
   */
  @Version(VERSION_NEUTRAL)
  @Post('/get-all')
  @UsePipes(ValidationPipe)
  async getAllCategories(
    @Body() filterCategoryDto: FilterAndPaginationCategoryDto,
    @Query('q') searchString: string,
  ): Promise<ResponsePayload> {
    return this.categoryService.getAllCategories(
      filterCategoryDto,
      searchString,
    );
  }

  @Version(VERSION_NEUTRAL)
  @Get('/:id')
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN)
  @UseGuards(AdminRolesGuard)
  @UseGuards(AdminJwtAuthGuard)
  async getCategoryById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query() select: string,
  ): Promise<ResponsePayload> {
    return await this.categoryService.getCategoryById(id, select);
  }

  /**
   * updateCategoryById()
   * updateMultipleCategoryById()
   * changeMultipleCategoryStatus()
   */
  @Version(VERSION_NEUTRAL)
  @Put('/update/:id')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async updateCategoryById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<ResponsePayload> {
    return await this.categoryService.updateCategoryById(id, updateCategoryDto);
  }

  @Version(VERSION_NEUTRAL)
  @Put('/update-multiple')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async updateMultipleCategoryById(
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<ResponsePayload> {
    return await this.categoryService.updateMultipleCategoryById(
      updateCategoryDto.ids,
      updateCategoryDto,
    );
  }

  @Version(VERSION_NEUTRAL)
  @Put('/change-multiple-category-status')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async changeMultipleCategoryStatus(
      @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<ResponsePayload> {
    return await this.categoryService.changeMultipleCategoryStatus(
        updateCategoryDto.ids,
        updateCategoryDto,
    );
  }

  /**
   * deleteCategoryById
   * deleteMultipleCategoryById
   */
  @Version(VERSION_NEUTRAL)
  @Delete('/delete/:id')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.DELETE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async deleteCategoryById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.categoryService.deleteCategoryById(
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
  async deleteMultipleCategoryById(
    @Body() data: { ids: string[] },
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.categoryService.deleteMultipleCategoryById(
      data.ids,
      Boolean(checkUsage),
    );
  }
}
