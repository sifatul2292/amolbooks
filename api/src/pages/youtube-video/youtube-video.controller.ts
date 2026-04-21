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
  AddYoutubeVideoDto,
  CheckYoutubeVideoDto,
  FilterAndPaginationYoutubeVideoDto,
  OptionYoutubeVideoDto,
  UpdateYoutubeVideoDto,
} from '../../dto/youtube-video.dto';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { MongoIdValidationPipe } from '../../pipes/mongo-id-validation.pipe';
import { YoutubeVideoService } from './youtube-video.service';
import { UserJwtAuthGuard } from '../../guards/user-jwt-auth.guard';
import { GetTokenUser } from '../../decorator/get-token-user.decorator';
import { User } from '../../interfaces/user/user.interface';

@Controller('youtubeVideo')
export class YoutubeVideoController {
  private logger = new Logger(YoutubeVideoController.name);

  constructor(private youtubeVideoService: YoutubeVideoService) {}

  /**
   * addYoutubeVideo
   * insertManyYoutubeVideo
   */
  @Post('/add')
  // @UsePipes(ValidationPipe)
  // @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  // @UseGuards(AdminRolesGuard)
  // @AdminMetaPermissions(AdminPermissions.CREATE)
  // @UseGuards(AdminPermissionGuard)
  // @UseGuards(AdminJwtAuthGuard)
  async addYoutubeVideo(
    @Body()
    addYoutubeVideoDto: AddYoutubeVideoDto,
  ): Promise<ResponsePayload> {
    return await this.youtubeVideoService.addYoutubeVideo(addYoutubeVideoDto);
  }

  @Post('/insert-many')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async insertManyYoutubeVideo(
    @Body()
    body: {
      data: AddYoutubeVideoDto[];
      option: OptionYoutubeVideoDto;
    },
  ): Promise<ResponsePayload> {
    return await this.youtubeVideoService.insertManyYoutubeVideo(
      body.data,
      body.option,
    );
  }

  /**
   * getAllYoutubeVideos
   * getYoutubeVideoById
   */
  @Version(VERSION_NEUTRAL)
  @Post('/get-all')
  @UsePipes(ValidationPipe)
  async getAllYoutubeVideos(
    @Body() filterYoutubeVideoDto: FilterAndPaginationYoutubeVideoDto,
    @Query('q') searchString: string,
  ): Promise<ResponsePayload> {
    return this.youtubeVideoService.getAllYoutubeVideos(
      filterYoutubeVideoDto,
      searchString,
    );
  }

  @Version(VERSION_NEUTRAL)
  @Get('/get-all-basic')
  async getAllYoutubeVideosBasic(): Promise<ResponsePayload> {
    return await this.youtubeVideoService.getAllYoutubeVideosBasic();
  }

  @Version(VERSION_NEUTRAL)
  @Get('/:id')
  async getYoutubeVideoById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query() select: string,
  ): Promise<ResponsePayload> {
    return await this.youtubeVideoService.getYoutubeVideoById(id, select);
  }

  /**
   * updateYoutubeVideoById
   * updateMultipleYoutubeVideoById
   */
  @Version(VERSION_NEUTRAL)
  @Put('/update/:id')
  // @UsePipes(ValidationPipe)
  // @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  // @UseGuards(AdminRolesGuard)
  // @AdminMetaPermissions(AdminPermissions.EDIT)
  // @UseGuards(AdminPermissionGuard)
  // @UseGuards(AdminJwtAuthGuard)
  async updateYoutubeVideoById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() updateYoutubeVideoDto: UpdateYoutubeVideoDto,
  ): Promise<ResponsePayload> {
    return await this.youtubeVideoService.updateYoutubeVideoById(
      id,
      updateYoutubeVideoDto,
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
  async updateMultipleYoutubeVideoById(
    @Body() updateYoutubeVideoDto: UpdateYoutubeVideoDto,
  ): Promise<ResponsePayload> {
    return await this.youtubeVideoService.updateMultipleYoutubeVideoById(
      updateYoutubeVideoDto.ids,
      updateYoutubeVideoDto,
    );
  }

  /**
   * deleteYoutubeVideoById
   * deleteMultipleYoutubeVideoById
   */
  @Version(VERSION_NEUTRAL)
  @Delete('/delete/:id')
  // @UsePipes(ValidationPipe)
  // @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  // @UseGuards(AdminRolesGuard)
  // @AdminMetaPermissions(AdminPermissions.DELETE)
  // @UseGuards(AdminPermissionGuard)
  // @UseGuards(AdminJwtAuthGuard)
  async deleteYoutubeVideoById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.youtubeVideoService.deleteYoutubeVideoById(
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
  async deleteMultipleYoutubeVideoById(
    @Body() data: { ids: string[] },
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.youtubeVideoService.deleteMultipleYoutubeVideoById(
      data.ids,
      Boolean(checkUsage),
    );
  }

  @Post('/check-contact-availability')
  @UsePipes(ValidationPipe)
  @UseGuards(UserJwtAuthGuard)
  async checkYoutubeVideoAvailability(
    @GetTokenUser() user: User,
    @Body() checkYoutubeVideoDto: CheckYoutubeVideoDto,
  ): Promise<ResponsePayload> {
    return await this.youtubeVideoService.checkYoutubeVideoAvailability(
      user,
      checkYoutubeVideoDto,
    );
  }
}
