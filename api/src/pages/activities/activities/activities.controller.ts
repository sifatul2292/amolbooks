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
  AddActivitiesDto,
  CheckActivitiesDto,
  FilterAndPaginationActivitiesDto,
  OptionActivitiesDto,
  UpdateActivitiesDto,
} from '../../../dto/activities.dto';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { MongoIdValidationPipe } from '../../../pipes/mongo-id-validation.pipe';
import { ActivitiesService } from './activities.service';
import { UserJwtAuthGuard } from '../../../guards/user-jwt-auth.guard';
import { GetTokenUser } from '../../../decorator/get-token-user.decorator';
import { User } from '../../../interfaces/user/user.interface';

@Controller('activities')
export class ActivitiesController {
  private logger = new Logger(ActivitiesController.name);

  constructor(private activitiesService: ActivitiesService) {}

  /**
   * addActivities
   * insertManyActivities
   */
  @Post('/add')
  // @UsePipes(ValidationPipe)
  // @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  // @UseGuards(AdminRolesGuard)
  // @AdminMetaPermissions(AdminPermissions.CREATE)
  // @UseGuards(AdminPermissionGuard)
  // @UseGuards(AdminJwtAuthGuard)
  async addActivities(
    @Body()
    addActivitiesDto: AddActivitiesDto,
  ): Promise<ResponsePayload> {
    return await this.activitiesService.addActivities(addActivitiesDto);
  }

  @Post('/insert-many')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async insertManyActivities(
    @Body()
    body: {
      data: AddActivitiesDto[];
      option: OptionActivitiesDto;
    },
  ): Promise<ResponsePayload> {
    return await this.activitiesService.insertManyActivities(body.data, body.option);
  }

  /**
   * getAllActivitiess
   * getActivitiesById
   */
  @Version(VERSION_NEUTRAL)
  @Post('/get-all')
  @UsePipes(ValidationPipe)
  async getAllActivitiess(
    @Body() filterActivitiesDto: FilterAndPaginationActivitiesDto,
    @Query('q') searchString: string,
  ): Promise<ResponsePayload> {
    return this.activitiesService.getAllActivitiess(filterActivitiesDto, searchString);
  }

  @Version(VERSION_NEUTRAL)
  @Get('/get-all-basic')
  async getAllActivitiessBasic(): Promise<ResponsePayload> {
    return await this.activitiesService.getAllActivitiessBasic();
  }

  @Version(VERSION_NEUTRAL)
  @Post('/activities-view-count')
  async productViewCount(
    @Body() data: { id: string; user: string },
  ): Promise<ResponsePayload> {
    return await this.activitiesService.activitiesViewCount(data?.id, data?.user);
  }

  @Version(VERSION_NEUTRAL)
  @Get('/:id')
  async getActivitiesById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query() select: string,
  ): Promise<ResponsePayload> {
    return await this.activitiesService.getActivitiesById(id, select);
  }

  /**
   * updateActivitiesById
   * updateMultipleActivitiesById
   */
  @Version(VERSION_NEUTRAL)
  @Put('/update/:id')
  // @UsePipes(ValidationPipe)
  // @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  // @UseGuards(AdminRolesGuard)
  // @AdminMetaPermissions(AdminPermissions.EDIT)
  // @UseGuards(AdminPermissionGuard)
  // @UseGuards(AdminJwtAuthGuard)
  async updateActivitiesById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() updateActivitiesDto: UpdateActivitiesDto,
  ): Promise<ResponsePayload> {
    return await this.activitiesService.updateActivitiesById(id, updateActivitiesDto);
  }

  @Version(VERSION_NEUTRAL)
  @Put('/update-multiple')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async updateMultipleActivitiesById(
    @Body() updateActivitiesDto: UpdateActivitiesDto,
  ): Promise<ResponsePayload> {
    return await this.activitiesService.updateMultipleActivitiesById(
      updateActivitiesDto.ids,
      updateActivitiesDto,
    );
  }

  /**
   * deleteActivitiesById
   * deleteMultipleActivitiesById
   */
  @Version(VERSION_NEUTRAL)
  @Delete('/delete/:id')
  // @UsePipes(ValidationPipe)
  // @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  // @UseGuards(AdminRolesGuard)
  // @AdminMetaPermissions(AdminPermissions.DELETE)
  // @UseGuards(AdminPermissionGuard)
  // @UseGuards(AdminJwtAuthGuard)
  async deleteActivitiesById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.activitiesService.deleteActivitiesById(id, Boolean(checkUsage));
  }

  @Version(VERSION_NEUTRAL)
  @Post('/delete-multiple')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.DELETE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async deleteMultipleActivitiesById(
    @Body() data: { ids: string[] },
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.activitiesService.deleteMultipleActivitiesById(
      data.ids,
      Boolean(checkUsage),
    );
  }

  @Post('/check-profile-availability')
  @UsePipes(ValidationPipe)
  @UseGuards(UserJwtAuthGuard)
  async checkActivitiesAvailability(
    @GetTokenUser() user: User,
    @Body() checkActivitiesDto: CheckActivitiesDto,
  ): Promise<ResponsePayload> {
    return await this.activitiesService.checkActivitiesAvailability(user, checkActivitiesDto);
  }
}
