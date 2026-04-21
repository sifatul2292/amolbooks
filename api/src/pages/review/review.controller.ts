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
  AddReviewDto,
  FilterAndPaginationReviewDto,
  GetReviewByIdsDto,
  OptionReviewDto,
  UpdateReviewDto,
} from '../../dto/review.dto';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { MongoIdValidationPipe } from '../../pipes/mongo-id-validation.pipe';
import { ReviewService } from './review.service';
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

@Controller('review')
export class ReviewController {
  private logger = new Logger(ReviewController.name);

  constructor(private reviewService: ReviewService) {}

  /**
   * addReview
   * insertManyReview
   */
  @Post('/add')
  @UsePipes(ValidationPipe)
  @UseGuards(UserJwtAuthGuard)
  async addReview(
    @GetUser() user: User,
    @Body()
    addReviewDto: AddReviewDto,
  ): Promise<ResponsePayload> {
    return await this.reviewService.addReview(user, addReviewDto);
  }

  @Post('/add-by-admin')
  // @UsePipes(ValidationPipe)
  // @UseGuards(UserJwtAuthGuard)
  async addReviewByAdmin(
    @Body()
      addReviewDto: AddReviewDto,
  ): Promise<ResponsePayload> {
    return await this.reviewService.addReviewByAdmin(addReviewDto);
  }

  /**
   * getAllReviews
   * getReviewById
   */

  @Version(VERSION_NEUTRAL)
  @Get('/get-all-review')
  @UsePipes(ValidationPipe)
  async getAllReviews(): Promise<ResponsePayload> {
    return this.reviewService.getAllReviews();
  }

  @Version(VERSION_NEUTRAL)
  @Post('/get-all-review-by-query')
  @UsePipes(ValidationPipe)
  async getAllReviewsByQuery(
    @Body() filterReviewDto: FilterAndPaginationReviewDto,
    @Query('q') searchString: string,
  ): Promise<ResponsePayload> {
    return this.reviewService.getAllReviewsByQuery(
      filterReviewDto,
      searchString,
    );
  }
  /**
   * getCartByUserId()
   */
  @Version(VERSION_NEUTRAL)
  @Get('/get-Review-by-user')
  @UsePipes(ValidationPipe)
  @UseGuards(UserJwtAuthGuard)
  async getCartByUserId(@GetTokenUser() user: User): Promise<ResponsePayload> {
    // console.log(user);
    
    return this.reviewService.getReviewByUserId(user);
   
    
  }
  @Version(VERSION_NEUTRAL)
  @Get('/:id')
  async getReviewById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query() select: string,
  ): Promise<ResponsePayload> {
    return await this.reviewService.getReviewById(id, select);
  }

  /**
   * updateReviewById
   * updateMultipleReviewById
   */
  @Version(VERSION_NEUTRAL)
  @Put('/update')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async updateReviewById(
    @Body() updateReviewDto: UpdateReviewDto,
  ): Promise<ResponsePayload> {
    // console.log('updateReviewDto', updateReviewDto);
    return await this.reviewService.updateReviewById(updateReviewDto);
  }

  @Version(VERSION_NEUTRAL)
  @Put('/update-and-review-remove')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async updateReviewByIdAndDelete(
    @Body() updateReviewDto: UpdateReviewDto,
  ): Promise<ResponsePayload> {
    // console.log('updateReviewDto', updateReviewDto);
    return await this.reviewService.updateReviewByIdAndDelete(updateReviewDto);
  }

  /**
   * deleteReviewById
   * deleteMultipleReviewById
   */
  @Version(VERSION_NEUTRAL)
  @Delete('/delete/:id')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.DELETE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async deleteReviewById(
    @Param('id', MongoIdValidationPipe) id: string,
  ): Promise<ResponsePayload> {
    return await this.reviewService.deleteReviewById(id);
  }

  @Version(VERSION_NEUTRAL)
  @Delete('/delete-loggedin-user-review/:id')
  @UsePipes(ValidationPipe)
  @UseGuards(AuthGuard(PASSPORT_USER_TOKEN_TYPE))
  async deleteReviewByLoggedinUserAndReviewId(
    @Param('id', MongoIdValidationPipe) id: string,
    @GetUser() user: User,
  ): Promise<ResponsePayload> {
    return await this.reviewService.deleteReviewByLoggedinUserAndReviewId(
      id,
      user,
    );
  }
}
