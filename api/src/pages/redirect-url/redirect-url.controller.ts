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
import {
  AddRedirectUrlDto,
  CheckRedirectUrlDto,
  FilterAndPaginationRedirectUrlDto,
  OptionRedirectUrlDto,
  UpdateRedirectUrlDto,
} from 'src/dto/redirect-url.dto';
import { ResponsePayload } from 'src/interfaces/core/response-payload.interface';
import { RedirectUrlService } from './redirect-url.service';
import { AdminRoles } from '../../enum/admin-roles.enum';
import { AdminMetaRoles } from '../../decorator/admin-roles.decorator';
import { AdminRolesGuard } from '../../guards/admin-roles.guard';
import { AdminMetaPermissions } from '../../decorator/admin-permissions.decorator';
import { AdminPermissions } from '../../enum/admin-permission.enum';
import { AdminPermissionGuard } from '../../guards/admin-permission.guard';
import { AdminJwtAuthGuard } from '../../guards/admin-jwt-auth.guard';
import { MongoIdValidationPipe } from '../../pipes/mongo-id-validation.pipe';
import { UserJwtAuthGuard } from '../../guards/user-jwt-auth.guard';
import { GetTokenUser } from '../../decorator/get-token-user.decorator';
import { User } from '../../interfaces/user/user.interface';

@Controller('redirect-url')
export class RedirectUrlController {
  private logger = new Logger(RedirectUrlController.name);

  constructor(private redirectUrlService: RedirectUrlService) {}

  /**
   * addRedirectUrl
   * insertManyRedirectUrl
   */
  @Post('/add')
  // @UsePipes(ValidationPipe)
  // @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  // @UseGuards(AdminRolesGuard)
  // @AdminMetaPermissions(AdminPermissions.CREATE)
  // @UseGuards(AdminPermissionGuard)
  // @UseGuards(AdminJwtAuthGuard)
  async addRedirectUrl(
    @Body()
    addRedirectUrlDto: AddRedirectUrlDto,
  ): Promise<ResponsePayload> {
    return await this.redirectUrlService.addRedirectUrl(addRedirectUrlDto);
  }

  @Post('/insert-many')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async insertManyRedirectUrl(
    @Body()
    body: {
      data: AddRedirectUrlDto[];
      option: OptionRedirectUrlDto;
    },
  ): Promise<ResponsePayload> {
    return await this.redirectUrlService.insertManyRedirectUrl(
      body.data,
      body.option,
    );
  }

  /**
   * getAllRedirectUrls
   * getRedirectUrlById
   */
  @Version(VERSION_NEUTRAL)
  @Post('/get-all')
  @UsePipes(ValidationPipe)
  async getAllRedirectUrls(
    @Body() filterRedirectUrlDto: FilterAndPaginationRedirectUrlDto,
    @Query('q') searchString: string,
  ): Promise<ResponsePayload> {
    return this.redirectUrlService.getAllRedirectUrls(
      filterRedirectUrlDto,
      searchString,
    );
  }

  @Version(VERSION_NEUTRAL)
  @Get('/get-all-basic')
  async getAllRedirectUrlsBasic(): Promise<ResponsePayload> {
    return await this.redirectUrlService.getAllRedirectUrlsBasic();
  }

  @Version(VERSION_NEUTRAL)
  @Get('/:id')
  async getRedirectUrlById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query() select: string,
  ): Promise<ResponsePayload> {
    return await this.redirectUrlService.getRedirectUrlById(id, select);
  }

  /**
   * updateRedirectUrlById
   * updateMultipleRedirectUrlById
   */
  @Version(VERSION_NEUTRAL)
  @Put('/update/:id')
  // @UsePipes(ValidationPipe)
  // @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  // @UseGuards(AdminRolesGuard)
  // @AdminMetaPermissions(AdminPermissions.EDIT)
  // @UseGuards(AdminPermissionGuard)
  // @UseGuards(AdminJwtAuthGuard)
  async updateRedirectUrlById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() updateRedirectUrlDto: UpdateRedirectUrlDto,
  ): Promise<ResponsePayload> {
    return await this.redirectUrlService.updateRedirectUrlById(
      id,
      updateRedirectUrlDto,
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
  async updateMultipleRedirectUrlById(
    @Body() updateRedirectUrlDto: UpdateRedirectUrlDto,
  ): Promise<ResponsePayload> {
    return await this.redirectUrlService.updateMultipleRedirectUrlById(
      updateRedirectUrlDto.ids,
      updateRedirectUrlDto,
    );
  }

  /**
   * deleteRedirectUrlById
   * deleteMultipleRedirectUrlById
   */
  @Version(VERSION_NEUTRAL)
  @Delete('/delete/:id')
  // @UsePipes(ValidationPipe)
  // @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  // @UseGuards(AdminRolesGuard)
  // @AdminMetaPermissions(AdminPermissions.DELETE)
  // @UseGuards(AdminPermissionGuard)
  // @UseGuards(AdminJwtAuthGuard)
  async deleteRedirectUrlById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.redirectUrlService.deleteRedirectUrlById(
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
  async deleteMultipleRedirectUrlById(
    @Body() data: { ids: string[] },
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.redirectUrlService.deleteMultipleRedirectUrlById(
      data.ids,
      Boolean(checkUsage),
    );
  }

  @Post('/check-redirectUrl-availability')
  @UsePipes(ValidationPipe)
  @UseGuards(UserJwtAuthGuard)
  async checkRedirectUrlAvailability(
    @GetTokenUser() user: User,
    @Body() checkRedirectUrlDto: CheckRedirectUrlDto,
  ): Promise<ResponsePayload> {
    return await this.redirectUrlService.checkRedirectUrlAvailability(
      user,
      checkRedirectUrlDto,
    );
  }
}
