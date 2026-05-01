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
import { Throttle } from '@nestjs/throttler';
import { UserService } from './user.service';
import { User, UserAuthResponse } from '../../interfaces/user/user.interface';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from '../../decorator/get-user.decorator';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import {
  AddAddressDto,
  AuthUserDto,
  CheckUserDto,
  CheckUserRegistrationDto,
  CreateSocialUserDto,
  CreateUserDto,
  FilterAndPaginationUserDto,
  FollowUnfollowAuthor,
  ResetPasswordDto,
  UpdateAddressDto,
  UpdateUserDto,
  UserSelectFieldDto,
} from '../../dto/user.dto';
import { MongoIdValidationPipe } from '../../pipes/mongo-id-validation.pipe';
import { AdminJwtAuthGuard } from '../../guards/admin-jwt-auth.guard';
import { AdminMetaRoles } from '../../decorator/admin-roles.decorator';
import { AdminRoles } from '../../enum/admin-roles.enum';
import { AdminRolesGuard } from '../../guards/admin-roles.guard';
import { AdminMetaPermissions } from '../../decorator/admin-permissions.decorator';
import { AdminPermissions } from '../../enum/admin-permission.enum';
import { AdminPermissionGuard } from '../../guards/admin-permission.guard';
import { PASSPORT_USER_TOKEN_TYPE } from '../../core/global-variables';
import { ChangePasswordDto } from '../../dto/change-password.dto';
import { UserJwtAuthGuard } from '../../guards/user-jwt-auth.guard';

@Controller('user')
export class UserController {
  private logger = new Logger(UserController.name);

  constructor(private usersService: UserService) {}

  /**
   * User Signup
   * User Login
   * User Signup & Login
   */

  @Post('/signup')
  @UsePipes(ValidationPipe)
  async userSignup(
    @Body()
    createUserDto: CreateUserDto,
  ): Promise<UserAuthResponse> {
    return await this.usersService.userSignup(createUserDto);
  }

  @Post('/login')
  @Throttle(10, 60)
  @UsePipes(ValidationPipe)
  async userLogin(@Body() authUserDto: AuthUserDto): Promise<UserAuthResponse> {
    return await this.usersService.userLogin(authUserDto);
  }

  @Post('/signup-and-login')
  @Throttle(10, 60)
  @UsePipes(ValidationPipe)
  async userSignupAndLogin(
    @Body() createUserDto: CreateUserDto,
  ): Promise<UserAuthResponse> {
    return await this.usersService.userSignupAndLogin(createUserDto);
  }

  @Post('/social-signup-and-login')
  @UsePipes(ValidationPipe)
  async userSignupAndLoginSocial(
    @Body() createUserDto: CreateSocialUserDto,
  ): Promise<UserAuthResponse> {
    return await this.usersService.userSignupAndLoginSocial(createUserDto);
  }

  @Post('/signup-and-login-password')
  @UsePipes(ValidationPipe)
  async userSignupAndLogin1(
    @Body() createUserDto: CreateUserDto,
  ): Promise<UserAuthResponse> {
    return await this.usersService.userSignupAndLogin1(createUserDto);
  }

  @Post('/check-user-for-registration')
  @UsePipes(ValidationPipe)
  async checkUserForRegistration(
    @Body()
    checkUserRegistrationDto: CheckUserRegistrationDto,
  ): Promise<ResponsePayload> {
    return await this.usersService.checkUserForRegistration1(
      checkUserRegistrationDto,
    );
  }

  // @Post('/check-user-for-registration')
  // @UsePipes(ValidationPipe)
  // async checkUserForRegistration(
  //   @Body()
  //   checkUserRegistrationDto: CheckUserRegistrationDto,
  // ): Promise<ResponsePayload> {
  //   return await this.usersService.checkUserForRegistration(
  //     checkUserRegistrationDto,
  //   );
  // }

  /**
   * Logged-in User Info
   */
  @Version(VERSION_NEUTRAL)
  @Get('/logged-in-user-data')
  @UseGuards(AuthGuard(PASSPORT_USER_TOKEN_TYPE))
  async getLoggedInUserData(
    @Query(ValidationPipe) userSelectFieldDto: UserSelectFieldDto,
    @GetUser() user: User,
  ): Promise<ResponsePayload> {
    return this.usersService.getLoggedInUserData(user, userSelectFieldDto);
  }

  /**
   * Get All Users (Not Recommended)
   * Get All Users V1 (Filter, Pagination, Select)
   * Get All Users V2 (Filter, Pagination, Select, Sort, Search Query)
   * Get All Users V3 (Filter, Pagination, Select, Sort, Search Query with Aggregation) ** Recommended
   * Get All Users by Search
   */

  @Version(VERSION_NEUTRAL)
  @Post('/get-all')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(
    AdminRoles.SUPER_ADMIN,
    AdminRoles.ADMIN,
    AdminRoles.EDITOR,
    AdminRoles.ACCOUNTANT,
  )
  @UseGuards(AdminRolesGuard)
  @UseGuards(AdminJwtAuthGuard)
  async getAllUsersV3(
    @Body() filterUserDto: FilterAndPaginationUserDto,
    @Query('q') searchString: string,
  ): Promise<ResponsePayload> {
    return this.usersService.getAllUsers(filterUserDto, searchString);
  }

  @Version(VERSION_NEUTRAL)
  @Get('/get-followed-author-list')
  @UsePipes(ValidationPipe)
  @UseGuards(AuthGuard(PASSPORT_USER_TOKEN_TYPE))
  async getFollowedAuthorListByUser(
    @GetUser() user: User,
  ): Promise<ResponsePayload> {
    return await this.usersService.getFollowedAuthorListByUser(user);
  }

  /**
   * Get User by ID
   * Update User by Id
   * Delete User by Id#
   * resetUserPassword()
   */
  @Version(VERSION_NEUTRAL)
  @Get('/get-user-address')
  // @UsePipes(ValidationPipe)
  @UseGuards(AuthGuard(PASSPORT_USER_TOKEN_TYPE))
  async getAllAddress(@GetUser() user: User): Promise<ResponsePayload> {
    return await this.usersService.getAllAddress(user);
  }
  @Version(VERSION_NEUTRAL)
  @Get('/:id')
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN, AdminRoles.EDITOR)
  @UseGuards(AdminRolesGuard)
  @UseGuards(AdminJwtAuthGuard)
  async getUserById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query(ValidationPipe) userSelectFieldDto: UserSelectFieldDto,
  ): Promise<ResponsePayload> {
    return await this.usersService.getUserById(id, userSelectFieldDto);
  }

  @Version(VERSION_NEUTRAL)
  @Put('/update-logged-in-user')
  @UsePipes(ValidationPipe)
  @UseGuards(AuthGuard(PASSPORT_USER_TOKEN_TYPE))
  async updateLoggedInUserInfo(
    @GetUser() user: User,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<ResponsePayload> {
    return await this.usersService.updateLoggedInUserInfo(user, updateUserDto);
  }

  @Version(VERSION_NEUTRAL)
  @Put('/change-logged-in-user-password')
  @UsePipes(ValidationPipe)
  @UseGuards(AuthGuard(PASSPORT_USER_TOKEN_TYPE))
  async changeLoggedInUserPassword(
    @GetUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<ResponsePayload> {
    return await this.usersService.changeLoggedInUserPassword(
      user,
      changePasswordDto,
    );
  }

  @Version(VERSION_NEUTRAL)
  @Put('/reset-user-password')
  @UsePipes(ValidationPipe)
  async resetUserPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<ResponsePayload> {
    return await this.usersService.resetUserPassword(resetPasswordDto);
  }

  @Version(VERSION_NEUTRAL)
  @Post('/check-user-and-sent-otp')
  @UsePipes(ValidationPipe)
  async checkUserAndSentOtp(
    @Body() checkUserDto: CheckUserDto,
  ): Promise<ResponsePayload> {
    return await this.usersService.checkUserAndSentOtp(checkUserDto);
  }

  @Version(VERSION_NEUTRAL)
  @Post('/author-follow-unfollow')
  @UsePipes(ValidationPipe)
  @UseGuards(AuthGuard(PASSPORT_USER_TOKEN_TYPE))
  async followUnfollowAuthor(
    @GetUser() user: User,
    @Body() followUnfollowAuthor: FollowUnfollowAuthor,
  ): Promise<ResponsePayload> {
    return await this.usersService.followUnfollowAuthor(
      user,
      followUnfollowAuthor,
    );
  }

  @Version(VERSION_NEUTRAL)
  @Post('/check-followed-author')
  @UsePipes(ValidationPipe)
  @UseGuards(AuthGuard(PASSPORT_USER_TOKEN_TYPE))
  async checkFollowedAuthorByUser(
    @GetUser() user: User,
    @Body() data: { author: string },
  ): Promise<ResponsePayload> {
    return await this.usersService.checkFollowedAuthorByUser(user, data.author);
  }

  @Version(VERSION_NEUTRAL)
  @Put('/update-data/:id')
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  @UsePipes(ValidationPipe)
  async updateUserById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<ResponsePayload> {
    return await this.usersService.updateUserById(id, updateUserDto);
  }

  @Version(VERSION_NEUTRAL)
  @Delete('/delete-data/:id')
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.DELETE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async deleteUserById(
    @Param('id', MongoIdValidationPipe) id: string,
  ): Promise<ResponsePayload> {
    return await this.usersService.deleteUserById(id);
  }

  @Version(VERSION_NEUTRAL)
  @Post('/delete-multiple-data-by-id')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.DELETE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async deleteMultipleUserById(
    @Body() data: { ids: string[] },
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.usersService.deleteMultipleUserById(
      data.ids,
      Boolean(checkUsage),
    );
  }

  // @Version(VERSION_NEUTRAL)
  // @Post('/delete-multiple-data-by-id')
  // @UsePipes(ValidationPipe)
  // @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN)
  // @UseGuards(AdminRolesGuard)
  // @AdminMetaPermissions(AdminPermissions.DELETE)
  // @UseGuards(AdminPermissionGuard)
  // @UseGuards(AdminJwtAuthGuard)
  // async deleteMultipleTaskById(
  //   @Body() data: { ids: string[] },
  //   @Query('checkUsage') checkUsage: boolean,
  // ): Promise<ResponsePayload> {
  //   return await this.usersService.deleteMultipleUserById(
  //     data.ids,
  //     Boolean(checkUsage),
  //   );
  // }

  /**
   * Address
   * addNewAddress()
   * updateAddressById()
   * deleteAddressById()
   */

  @Version(VERSION_NEUTRAL)
  @Post('/add-address')
  @UsePipes(ValidationPipe)
  @UseGuards(UserJwtAuthGuard)
  async addNewAddress(
    @GetUser() user: User,
    @Body() addAddressDto: AddAddressDto,
  ): Promise<ResponsePayload> {
    return await this.usersService.addNewAddress(user, addAddressDto);
  }

  @Version(VERSION_NEUTRAL)
  @Put('/edit-address/:id')
  @UsePipes(ValidationPipe)
  @UseGuards(UserJwtAuthGuard)
  async updateAddressById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ): Promise<ResponsePayload> {
    return await this.usersService.updateAddressById(id, updateAddressDto);
  }

  @Version(VERSION_NEUTRAL)
  @Put('/set-default-address/:id')
  @UsePipes(ValidationPipe)
  @UseGuards(UserJwtAuthGuard)
  async setDefaultAddressById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() updateAddressDto: UpdateAddressDto,
    @GetUser() user: User,
  ): Promise<ResponsePayload> {
    console.log('user', user);
    return await this.usersService.setDefaultAddressById(user, id);
  }

  @Version(VERSION_NEUTRAL)
  @Delete('/delete-address/:id')
  @UsePipes(ValidationPipe)
  @UseGuards(UserJwtAuthGuard)
  async deleteAddressById(
    @Param('id', MongoIdValidationPipe) id: string,
    @GetUser() user: User,
  ): Promise<ResponsePayload> {
    return await this.usersService.deleteAddressById(id, user);
  }
}
