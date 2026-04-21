/* eslint-disable prettier/prettier */
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
  AddActivitiesCommentDto,
  FilterAndPaginationActivitiesCommentDto,
  GetActivitiesCommentByIdsDto,
  OptionActivitiesCommentDto,
  UpdateActivitiesCommentDto,
} from '../../dto/activities-comment.dto';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { MongoIdValidationPipe } from '../../pipes/mongo-id-validation.pipe';
import { ActivitiesCommentService } from './activities-comment.service';
import { GetUser } from '../../decorator/get-user.decorator';
import { User } from '../../interfaces/user/user.interface';
import { UserJwtAuthGuard } from '../../guards/user-jwt-auth.guard';
import {
  FilterAndPaginationProductDto,
  GetProductByIdsDto,
} from '../../dto/product.dto';
import { AuthGuard } from '@nestjs/passport';
import { PASSPORT_USER_TOKEN_TYPE } from '../../core/global-variables';
import { GetTokenUser } from 'src/decorator/get-token-user.decorator';

@Controller('activities-comment')
export class ActivitiesCommentController {
  private logger = new Logger(ActivitiesCommentController.name);

  constructor(private activitiesCommentService: ActivitiesCommentService) {}

  /**
   * addActivitiesComment
   * insertManyActivitiesComment
   */
  @Post('/add')
  @UsePipes(ValidationPipe)
  @UseGuards(UserJwtAuthGuard)
  async addActivitiesComment(
    @GetUser() user: User,
    @Body()
      addActivitiesCommentDto: AddActivitiesCommentDto,
  ): Promise<ResponsePayload> {
    return await this.activitiesCommentService.addActivitiesComment(user, addActivitiesCommentDto);
  }

  @Post('/add-by-admin')
  // @UsePipes(ValidationPipe)
  // @UseGuards(UserJwtAuthGuard)
  async addActivitiesCommentByAdmin(
    @Body()
      addActivitiesCommentDto: AddActivitiesCommentDto,
  ): Promise<ResponsePayload> {
    return await this.activitiesCommentService.addActivitiesCommentByAdmin(addActivitiesCommentDto);
  }

  /**
   * getAllActivitiesComments
   * getActivitiesCommentById
   */

  @Version(VERSION_NEUTRAL)
  @Get('/get-all-activitiesComment')
  @UsePipes(ValidationPipe)
  async getAllActivitiesComments(): Promise<ResponsePayload> {
    return this.activitiesCommentService.getAllActivitiesComments();
  }

  @Version(VERSION_NEUTRAL)
  @Post('/get-all-activitiesComment-by-query')
  @UsePipes(ValidationPipe)
  async getAllActivitiesCommentsByQuery(
    @Body() filterActivitiesCommentDto: FilterAndPaginationActivitiesCommentDto,
    @Query('q') searchString: string,
  ): Promise<ResponsePayload> {
    return this.activitiesCommentService.getAllActivitiesCommentsByQuery(
      filterActivitiesCommentDto,
      searchString,
    );
  }
  /**
   * getCartByUserId()
   */
  @Version(VERSION_NEUTRAL)
  @Get('/get-ActivitiesComment-by-user')
  @UsePipes(ValidationPipe)
  @UseGuards(UserJwtAuthGuard)
  async getCartByUserId(@GetTokenUser() user: User): Promise<ResponsePayload> {
    // console.log(user);

    return this.activitiesCommentService.getActivitiesCommentByUserId(user);


  }
  @Version(VERSION_NEUTRAL)
  @Get('/:id')
  async getActivitiesCommentById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query() select: string,
  ): Promise<ResponsePayload> {
    return await this.activitiesCommentService.getActivitiesCommentById(id, select);
  }

  /**
   * updateActivitiesCommentById
   * updateMultipleActivitiesCommentById
   */
  @Version(VERSION_NEUTRAL)
  @Put('/update')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async updateActivitiesCommentById(
    @Body() updateActivitiesCommentDto: UpdateActivitiesCommentDto,
  ): Promise<ResponsePayload> {
    // console.log('updateActivitiesCommentDto', updateActivitiesCommentDto);
    return await this.activitiesCommentService.updateActivitiesCommentById(updateActivitiesCommentDto);
  }

  @Version(VERSION_NEUTRAL)
  @Put('/update-and-activitiesComment-remove')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async updateActivitiesCommentByIdAndDelete(
    @Body() updateActivitiesCommentDto: UpdateActivitiesCommentDto,
  ): Promise<ResponsePayload> {
    // console.log('updateActivitiesCommentDto', updateActivitiesCommentDto);
    return await this.activitiesCommentService.updateActivitiesCommentByIdAndDelete(updateActivitiesCommentDto);
  }

  /**
   * deleteActivitiesCommentById
   * deleteMultipleActivitiesCommentById
   */
  @Version(VERSION_NEUTRAL)
  @Delete('/delete/:id')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.DELETE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async deleteActivitiesCommentById(
    @Param('id', MongoIdValidationPipe) id: string,
  ): Promise<ResponsePayload> {
    return await this.activitiesCommentService.deleteActivitiesCommentById(id);
  }

  @Version(VERSION_NEUTRAL)
  @Delete('/delete-loggedin-user-activitiesComment/:id')
  @UsePipes(ValidationPipe)
  @UseGuards(AuthGuard(PASSPORT_USER_TOKEN_TYPE))
  async deleteActivitiesCommentByLoggedinUserAndActivitiesCommentId(
    @Param('id', MongoIdValidationPipe) id: string,
    @GetUser() user: User,
  ): Promise<ResponsePayload> {
    return await this.activitiesCommentService.deleteActivitiesCommentByLoggedinUserAndActivitiesCommentId(
      id,
      user,
    );
  }
}
