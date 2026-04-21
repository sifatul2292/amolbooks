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
import { SpecialPackageService } from './special-package.service';
import {
  AddSpecialPackageDto,
  FilterAndPaginationSpecialPackageDto,
  OptionSpecialPackageDto,
  UpdateSpecialPackageDto,
} from '../../../dto/special-package.dto';
import { GetProductByIdsDto } from '../../../dto/product.dto';

@Controller('special-package')
export class SpecialPackageController {
  private logger = new Logger(SpecialPackageController.name);

  constructor(private promoOfferService: SpecialPackageService) {}

  /**
   * ADD
   * addSpecialPackage()
   * insertManySpecialPackage()
   */
  @Post('/add')
  @UsePipes(ValidationPipe)
  async addSpecialPackage(
    @Body()
    addSpecialPackageDto: AddSpecialPackageDto,
  ): Promise<ResponsePayload> {
    return await this.promoOfferService.addSpecialPackage(addSpecialPackageDto);
  }

  @Post('/insert-many')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async insertManySpecialPackage(
    @Body()
    body: {
      data: AddSpecialPackageDto[];
      option: OptionSpecialPackageDto;
    },
  ): Promise<ResponsePayload> {
    return await this.promoOfferService.insertManySpecialPackage(
      body.data,
      body.option,
    );
  }

  /**
   * GET
   * getAllSpecialPackages()
   * getSpecialPackageSingle()
   * getSpecialPackageById()
   */
  @Version(VERSION_NEUTRAL)
  @Post('/get-all')
  @UsePipes(ValidationPipe)
  async getAllSpecialPackages(
    @Body() filterSpecialPackageDto: FilterAndPaginationSpecialPackageDto,
    @Query('q') searchString: string,
  ): Promise<ResponsePayload> {
    return this.promoOfferService.getAllSpecialPackages(
      filterSpecialPackageDto,
      searchString,
    );
  }

  @Version(VERSION_NEUTRAL)
  @Get('/promotional-offer')
  async getSpecialPackageSingle(
    @Query() select: string,
  ): Promise<ResponsePayload> {
    return await this.promoOfferService.getSpecialPackageSingle(select);
  }

  @Version(VERSION_NEUTRAL)
  @Get('/:id')
  // @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN)
  // @UseGuards(AdminRolesGuard)
  // @UseGuards(AdminJwtAuthGuard)
  async getSpecialPackageById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query() select: string,
  ): Promise<ResponsePayload> {
    return await this.promoOfferService.getSpecialPackageById(id, select);
  }

  @Version(VERSION_NEUTRAL)
  @Get('/slug/:slug')
  // @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN)
  // @UseGuards(AdminRolesGuard)
  // @UseGuards(AdminJwtAuthGuard)
  async getSpecialPackageBySlug(
    @Param('slug') slug: string,
    @Query() select: string,
  ): Promise<ResponsePayload> {
    // console.warn(slug)
    return await this.promoOfferService.getSpecialPackageBySlug(slug, select);
  }

  @Version(VERSION_NEUTRAL)
  @Post('/get-products-by-ids')
  async getProductByIds(
    @Body() ids: any,
    @Query() select: string,
  ): Promise<ResponsePayload> {
    return await this.promoOfferService.getSpecialPackageByIds(ids, select);
  }

  /**
   * UPDATE
   * updateSpecialPackageById()
   * updateMultipleSpecialPackageById()
   */
  @Version(VERSION_NEUTRAL)
  @Put('/update/:id')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async updateSpecialPackageById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() updateSpecialPackageDto: UpdateSpecialPackageDto,
  ): Promise<ResponsePayload> {
    return await this.promoOfferService.updateSpecialPackageById(
      id,
      updateSpecialPackageDto,
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
  async updateMultipleSpecialPackageById(
    @Body() updateSpecialPackageDto: UpdateSpecialPackageDto,
  ): Promise<ResponsePayload> {
    return await this.promoOfferService.updateMultipleSpecialPackageById(
      updateSpecialPackageDto.ids,
      updateSpecialPackageDto,
    );
  }

  /**
   * DELETE
   * deleteSpecialPackageById()
   * deleteMultipleSpecialPackageById()
   */
  @Version(VERSION_NEUTRAL)
  @Delete('/delete/:id')
  @UsePipes(ValidationPipe)
  async deleteSpecialPackageById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.promoOfferService.deleteSpecialPackageById(
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
  async deleteMultipleSpecialPackageById(
    @Body() data: { ids: string[] },
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.promoOfferService.deleteMultipleSpecialPackageById(
      data.ids,
      Boolean(checkUsage),
    );
  }
}
