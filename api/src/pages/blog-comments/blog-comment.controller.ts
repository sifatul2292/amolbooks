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
  AddBlogCommentDto,
  FilterAndPaginationBlogCommentDto,
  GetBlogCommentByIdsDto,
  OptionBlogCommentDto,
  UpdateBlogCommentDto,
} from '../../dto/blog-comment.dto';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { MongoIdValidationPipe } from '../../pipes/mongo-id-validation.pipe';
import { BlogCommentService } from './blog-comment.service';
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

@Controller('comment')
export class BlogCommentController {
  private logger = new Logger(BlogCommentController.name);

  constructor(private blogCommentService: BlogCommentService) {}

  /**
   * addBlogComment
   * insertManyBlogComment
   */
  @Post('/add')
  @UsePipes(ValidationPipe)
  @UseGuards(UserJwtAuthGuard)
  async addBlogComment(
    @GetUser() user: User,
    @Body()
      addBlogCommentDto: AddBlogCommentDto,
  ): Promise<ResponsePayload> {
    return await this.blogCommentService.addBlogComment(user, addBlogCommentDto);
  }

  @Post('/add-by-admin')
  // @UsePipes(ValidationPipe)
  // @UseGuards(UserJwtAuthGuard)
  async addBlogCommentByAdmin(
    @Body()
      addBlogCommentDto: AddBlogCommentDto,
  ): Promise<ResponsePayload> {
    return await this.blogCommentService.addBlogCommentByAdmin(addBlogCommentDto);
  }

  /**
   * getAllBlogComments
   * getBlogCommentById
   */

  @Version(VERSION_NEUTRAL)
  @Get('/get-all-blogComment')
  @UsePipes(ValidationPipe)
  async getAllBlogComments(): Promise<ResponsePayload> {
    return this.blogCommentService.getAllBlogComments();
  }

  @Version(VERSION_NEUTRAL)
  @Post('/get-all-blogComment-by-query')
  @UsePipes(ValidationPipe)
  async getAllBlogCommentsByQuery(
    @Body() filterBlogCommentDto: FilterAndPaginationBlogCommentDto,
    @Query('q') searchString: string,
  ): Promise<ResponsePayload> {
    return this.blogCommentService.getAllBlogCommentsByQuery(
      filterBlogCommentDto,
      searchString,
    );
  }
  /**
   * getCartByUserId()
   */
  @Version(VERSION_NEUTRAL)
  @Get('/get-BlogComment-by-user')
  @UsePipes(ValidationPipe)
  @UseGuards(UserJwtAuthGuard)
  async getCartByUserId(@GetTokenUser() user: User): Promise<ResponsePayload> {
    // console.log(user);

    return this.blogCommentService.getBlogCommentByUserId(user);


  }
  @Version(VERSION_NEUTRAL)
  @Get('/:id')
  async getBlogCommentById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query() select: string,
  ): Promise<ResponsePayload> {
    return await this.blogCommentService.getBlogCommentById(id, select);
  }

  /**
   * updateBlogCommentById
   * updateMultipleBlogCommentById
   */
  @Version(VERSION_NEUTRAL)
  @Put('/update')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async updateBlogCommentById(
    @Body() updateBlogCommentDto: UpdateBlogCommentDto,
  ): Promise<ResponsePayload> {
    // console.log('updateBlogCommentDto', updateBlogCommentDto);
    return await this.blogCommentService.updateBlogCommentById(updateBlogCommentDto);
  }

  @Version(VERSION_NEUTRAL)
  @Put('/update-and-blogComment-remove')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async updateBlogCommentByIdAndDelete(
    @Body() updateBlogCommentDto: UpdateBlogCommentDto,
  ): Promise<ResponsePayload> {
    // console.log('updateBlogCommentDto', updateBlogCommentDto);
    return await this.blogCommentService.updateBlogCommentByIdAndDelete(updateBlogCommentDto);
  }

  /**
   * deleteBlogCommentById
   * deleteMultipleBlogCommentById
   */
  @Version(VERSION_NEUTRAL)
  @Delete('/delete/:id')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.DELETE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async deleteBlogCommentById(
    @Param('id', MongoIdValidationPipe) id: string,
  ): Promise<ResponsePayload> {
    return await this.blogCommentService.deleteBlogCommentById(id);
  }

  @Version(VERSION_NEUTRAL)
  @Delete('/delete-loggedin-user-blogComment/:id')
  @UsePipes(ValidationPipe)
  @UseGuards(AuthGuard(PASSPORT_USER_TOKEN_TYPE))
  async deleteBlogCommentByLoggedinUserAndBlogCommentId(
    @Param('id', MongoIdValidationPipe) id: string,
    @GetUser() user: User,
  ): Promise<ResponsePayload> {
    return await this.blogCommentService.deleteBlogCommentByLoggedinUserAndBlogCommentId(
      id,
      user,
    );
  }
}
