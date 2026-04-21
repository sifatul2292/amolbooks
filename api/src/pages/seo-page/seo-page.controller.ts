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
  AddSeoPageDto,
  FilterAndPaginationSeoPageDto,
  OptionSeoPageDto,
  UpdateSeoPageDto,
} from '../../dto/seo-page.dto';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { MongoIdValidationPipe } from '../../pipes/mongo-id-validation.pipe';
import { SeoPageService } from './seo-page.service';

@Controller('seoPage')
export class SeoPageController {
  private logger = new Logger(SeoPageController.name);

  constructor(private seoPageService: SeoPageService) {}

  /**
   * addSeoPage
   * insertManySeoPage
   */
  @Post('/add')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async addSeoPage(
    @Body()
    addSeoPageDto: AddSeoPageDto,
  ): Promise<ResponsePayload> {
    return await this.seoPageService.addSeoPage(addSeoPageDto);
  }

  @Post('/insert-many')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async insertManySeoPage(
    @Body()
    body: {
      data: AddSeoPageDto[];
      option: OptionSeoPageDto;
    },
  ): Promise<ResponsePayload> {
    return await this.seoPageService.insertManySeoPage(body.data, body.option);
  }

  /**
   * getAllSeoPages
   * getSeoPageById
   */
  @Version(VERSION_NEUTRAL)
  @Post('/get-all')
  @UsePipes(ValidationPipe)
  async getAllSeoPages(
    @Body() filterSeoPageDto: FilterAndPaginationSeoPageDto,
    @Query('q') searchString: string,
  ): Promise<ResponsePayload> {
    return this.seoPageService.getAllSeoPages(filterSeoPageDto, searchString);
  }

  @Version(VERSION_NEUTRAL)
  @Get('/:id')
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN)
  @UseGuards(AdminRolesGuard)
  @UseGuards(AdminJwtAuthGuard)
  async getSeoPageById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query() select: string,
  ): Promise<ResponsePayload> {
    return await this.seoPageService.getSeoPageById(id, select);
  }

  @Version(VERSION_NEUTRAL)
  @Get('/get-by/:pageName')
  @UsePipes(ValidationPipe)
  async getSeoPageByPage(
    @Param('pageName') pageName: string,
    @Query('select') select: string,
  ): Promise<ResponsePayload> {
    return await this.seoPageService.getSeoPageByPage(pageName, select);
  }

  /**
   * updateSeoPageById
   * updateMultipleSeoPageById
   */
  @Version(VERSION_NEUTRAL)
  @Put('/update/:id')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async updateSeoPageById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() updateSeoPageDto: UpdateSeoPageDto,
  ): Promise<ResponsePayload> {
    return await this.seoPageService.updateSeoPageById(id, updateSeoPageDto);
  }

  @Version(VERSION_NEUTRAL)
  @Put('/update-multiple')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async updateMultipleSeoPageById(
    @Body() updateSeoPageDto: UpdateSeoPageDto,
  ): Promise<ResponsePayload> {
    return await this.seoPageService.updateMultipleSeoPageById(
      updateSeoPageDto.ids,
      updateSeoPageDto,
    );
  }

  /**
   * deleteSeoPageById
   * deleteMultipleSeoPageById
   */
  @Version(VERSION_NEUTRAL)
  @Delete('/delete/:id')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.DELETE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async deleteSeoPageById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.seoPageService.deleteSeoPageById(id, Boolean(checkUsage));
  }

  @Version(VERSION_NEUTRAL)
  @Post('/delete-multiple')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.DELETE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async deleteMultipleSeoPageById(
    @Body() data: { ids: string[] },
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.seoPageService.deleteMultipleSeoPageById(
      data.ids,
      Boolean(checkUsage),
    );
  }
}
