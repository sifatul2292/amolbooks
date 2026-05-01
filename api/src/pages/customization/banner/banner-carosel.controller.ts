import {
  Body,
  CacheInterceptor,
  CacheTTL,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
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
  AddBannerCaroselDto,
  CheckBannerCaroselDto,
  FilterAndPaginationBannerCaroselDto,
  OptionBannerCaroselDto,
  UpdateBannerCaroselDto,
} from '../../../dto/banner-carosel.dto';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { MongoIdValidationPipe } from '../../../pipes/mongo-id-validation.pipe';
import { BannerCaroselService } from './banner-carosel.service';
import { UserJwtAuthGuard } from '../../../guards/user-jwt-auth.guard';
import { GetTokenUser } from '../../../decorator/get-token-user.decorator';
import { User } from '../../../interfaces/user/user.interface';

@Controller('banner-carousel')
export class BannerCaroselController {
  private logger = new Logger(BannerCaroselController.name);

  constructor(private bannerCaroselService: BannerCaroselService) {}

  /**
   * addBannerCarosel
   * insertManyBannerCarosel
   */
  @Post('/add')
  // @UsePipes(ValidationPipe)
  // @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  // @UseGuards(AdminRolesGuard)
  // @AdminMetaPermissions(AdminPermissions.CREATE)
  // @UseGuards(AdminPermissionGuard)
  // @UseGuards(AdminJwtAuthGuard)
  async addBannerCarosel(
    @Body()
    addBannerCaroselDto: AddBannerCaroselDto,
  ): Promise<ResponsePayload> {
    return await this.bannerCaroselService.addBannerCarosel(addBannerCaroselDto);
  }

  @Post('/insert-many')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async insertManyBannerCarosel(
    @Body()
    body: {
      data: AddBannerCaroselDto[];
      option: OptionBannerCaroselDto;
    },
  ): Promise<ResponsePayload> {
    return await this.bannerCaroselService.insertManyBannerCarosel(body.data, body.option);
  }

  /**
   * getAllBannerCarosels
   * getBannerCaroselById
   */
  @Version(VERSION_NEUTRAL)
  @Post('/get-all')
  @UsePipes(ValidationPipe)
  async getAllBannerCarosels(
    @Body() filterBannerCaroselDto: FilterAndPaginationBannerCaroselDto,
    @Query('q') searchString: string,
  ): Promise<ResponsePayload> {
    return this.bannerCaroselService.getAllBannerCarosels(filterBannerCaroselDto, searchString);
  }

  @Version(VERSION_NEUTRAL)
  @Get('/get-all-basic')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(600)
  async getAllBannerCaroselsBasic(): Promise<ResponsePayload> {
    return await this.bannerCaroselService.getAllBannerCaroselsBasic();
  }

  @Version(VERSION_NEUTRAL)
  @Get('/:id')
  async getBannerCaroselById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query() select: string,
  ): Promise<ResponsePayload> {
    return await this.bannerCaroselService.getBannerCaroselById(id, select);
  }

  /**
   * updateBannerCaroselById
   * updateMultipleBannerCaroselById
   */
  @Version(VERSION_NEUTRAL)
  @Put('/update/:id')
  // @UsePipes(ValidationPipe)
  // @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  // @UseGuards(AdminRolesGuard)
  // @AdminMetaPermissions(AdminPermissions.EDIT)
  // @UseGuards(AdminPermissionGuard)
  // @UseGuards(AdminJwtAuthGuard)
  async updateBannerCaroselById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() updateBannerCaroselDto: UpdateBannerCaroselDto,
  ): Promise<ResponsePayload> {
    return await this.bannerCaroselService.updateBannerCaroselById(id, updateBannerCaroselDto);
  }

  @Version(VERSION_NEUTRAL)
  @Put('/update-multiple')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async updateMultipleBannerCaroselById(
    @Body() updateBannerCaroselDto: UpdateBannerCaroselDto,
  ): Promise<ResponsePayload> {
    return await this.bannerCaroselService.updateMultipleBannerCaroselById(
      updateBannerCaroselDto.ids,
      updateBannerCaroselDto,
    );
  }

  /**
   * deleteBannerCaroselById
   * deleteMultipleBannerCaroselById
   */
  @Version(VERSION_NEUTRAL)
  @Delete('/delete/:id')
  // @UsePipes(ValidationPipe)
  // @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  // @UseGuards(AdminRolesGuard)
  // @AdminMetaPermissions(AdminPermissions.DELETE)
  // @UseGuards(AdminPermissionGuard)
  // @UseGuards(AdminJwtAuthGuard)
  async deleteBannerCaroselById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.bannerCaroselService.deleteBannerCaroselById(id, Boolean(checkUsage));
  }

  @Version(VERSION_NEUTRAL)
  @Post('/delete-multiple')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.DELETE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async deleteMultipleBannerCaroselById(
    @Body() data: { ids: string[] },
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.bannerCaroselService.deleteMultipleBannerCaroselById(
      data.ids,
      Boolean(checkUsage),
    );
  }

  @Post('/check-bannerCarosel-availability')
  @UsePipes(ValidationPipe)
  @UseGuards(UserJwtAuthGuard)
  async checkBannerCaroselAvailability(
    @GetTokenUser() user: User,
    @Body() checkBannerCaroselDto: CheckBannerCaroselDto,
  ): Promise<ResponsePayload> {
    return await this.bannerCaroselService.checkBannerCaroselAvailability(
      user,
      checkBannerCaroselDto,
    );
  }
}
