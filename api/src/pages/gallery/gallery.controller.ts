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
  AddGalleryDto,
  FilterAndPaginationGalleryDto,
  OptionGalleryDto,
  UpdateGalleryDto,
} from '../../dto/gallery.dto';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { MongoIdValidationPipe } from '../../pipes/mongo-id-validation.pipe';
import { GalleryService } from './gallery.service';

@Controller('gallery')
export class GalleryController {
  private logger = new Logger(GalleryController.name);

  constructor(private galleryService: GalleryService) {}

  /**
   * addGallery
   * insertManyGallery
   */
  @Post('/add')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async addGallery(
    @Body()
    addGalleryDto: AddGalleryDto,
  ): Promise<ResponsePayload> {
    return await this.galleryService.addGallery(addGalleryDto);
  }

  @Post('/insert-many')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(
    AdminRoles.SUPER_ADMIN,
    AdminRoles.ADMIN,
    AdminRoles.ACCOUNTANT,
  )
  // @UseGuards(AdminRolesGuard)
  // @AdminMetaPermissions(AdminPermissions.CREATE)
  // @UseGuards(AdminPermissionGuard)
  // @UseGuards(AdminJwtAuthGuard)
  async insertManyGallery(
    @Body()
    body: {
      data: AddGalleryDto[];
      option: OptionGalleryDto;
    },
  ): Promise<ResponsePayload> {
    return await this.galleryService.insertManyGallery(body.data, body.option);
  }

  /**
   * getAllGalleries
   * getGalleryById
   */
  @Version(VERSION_NEUTRAL)
  @Post('/all-galleries')
  @UsePipes(ValidationPipe)
  async getAllGalleries(
    @Body() filterGalleryDto: FilterAndPaginationGalleryDto,
    @Query('q') searchString: string,
  ): Promise<ResponsePayload> {
    return this.galleryService.getAllGalleries(filterGalleryDto, searchString);
  }

  @Version(VERSION_NEUTRAL)
  @Post('/get-all')
  @UsePipes(ValidationPipe)
  async getAllGalleriesByAdmin(
    @Body() filterGalleryDto: FilterAndPaginationGalleryDto,
    @Query('q') searchString: string,
  ): Promise<ResponsePayload> {
    return this.galleryService.getAllGalleries(filterGalleryDto, searchString);
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
  async getGalleryById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query() select: string,
  ): Promise<ResponsePayload> {
    return await this.galleryService.getGalleryById(id, select);
  }

  /**
   * updateGalleryById
   * updateMultipleGalleryById
   */
  @Version(VERSION_NEUTRAL)
  @Put('/update-gallery/:id')
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
  async updateGalleryById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() updateGalleryDto: UpdateGalleryDto,
  ): Promise<ResponsePayload> {
    return await this.galleryService.updateGalleryById(id, updateGalleryDto);
  }

  @Version(VERSION_NEUTRAL)
  @Put('/update-multiple-gallery-by-id')
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
  async updateMultipleGalleryById(
    @Body() updateGalleryDto: UpdateGalleryDto,
  ): Promise<ResponsePayload> {
    return await this.galleryService.updateMultipleGalleryById(
      updateGalleryDto.ids,
      updateGalleryDto,
    );
  }

  /**
   * deleteGalleryById
   * deleteMultipleGalleryById
   */
  @Version(VERSION_NEUTRAL)
  @Delete('/delete-gallery/:id')
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
  async deleteGalleryById(
    @Param('id', MongoIdValidationPipe) id: string,
  ): Promise<ResponsePayload> {
    return await this.galleryService.deleteGalleryById(id);
  }

  @Version(VERSION_NEUTRAL)
  @Post('/delete-multiple-gallery-by-id')
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
  async deleteMultipleGalleryById(
    @Body() data: { ids: string[] },
  ): Promise<ResponsePayload> {
    return await this.galleryService.deleteMultipleGalleryById(data.ids);
  }
}
