import {
  BadRequestException,
  CACHE_MANAGER,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import {
  User,
  UserAuthResponse,
  UserJwtPayload,
} from '../../interfaces/user/user.interface';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { ErrorCodes } from '../../enum/error-code.enum';

import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import {
  AddAddressDto,
  AuthSocialUserDto,
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
import { AdminAuthResponse } from '../../interfaces/admin/admin.interface';
import { ChangePasswordDto } from '../../dto/change-password.dto';
import { Cache } from 'cache-manager';
import { UtilsService } from '../../shared/utils/utils.service';
import { UpdateCartQty } from '../../dto/cart.dto';
import { Author } from '../../interfaces/common/author.interface';

const ObjectId = Types.ObjectId;

@Injectable()
export class UserService {
  private logger = new Logger(UserService.name);
  // Cache
  private readonly cacheAllData = 'getAllUser';
  private readonly cacheDataCount = 'getCountUser';

  constructor(
    @InjectModel('User') private readonly userModel: Model<User>,
    @InjectModel('Author') private readonly authorModel: Model<Author>,
    @InjectModel('Address') private readonly addressModel: Model<User>,
    protected jwtService: JwtService,
    private configService: ConfigService,
    private utilsService: UtilsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * User Signup
   * User Login
   * User Signup & Login
   * checkUserForRegistration()
   */
  async userSignup(createUserDto: CreateUserDto): Promise<User> {
    const { password } = createUserDto;
    const salt = await bcrypt.genSalt();
    const hashedPass = await bcrypt.hash(password, salt);

    const mData = { ...createUserDto, ...{ password: hashedPass } };
    const newUser = new this.userModel(mData);
    try {
      const saveData = await newUser.save();
      // Cache Removed
      await this.cacheManager.del(this.cacheAllData);
      await this.cacheManager.del(this.cacheDataCount);

      return {
        success: true,
        message: 'Success',
        username: saveData.username,
        name: saveData.name,
        _id: saveData._id,
      } as User;
    } catch (error) {
      console.log(error);
      if (error.code && error.code.toString() === ErrorCodes.UNIQUE_FIELD) {
        throw new ConflictException('Username already exists');
      } else {
        throw new InternalServerErrorException();
      }
    }
  }

  async userLogin(authUserDto: AuthUserDto): Promise<UserAuthResponse> {
    try {
      const user = (await this.userModel
        .findOne({ username: authUserDto.username })
        .select('password username hasAccess')) as User;

      if (!user) {
        return {
          success: false,
          message: 'This phone no is not registered!',
        } as UserAuthResponse;
      }

      if (!user.hasAccess) {
        return {
          success: false,
          message: 'No Access for Login',
        } as AdminAuthResponse;
      }

      const isMatch = await bcrypt.compare(authUserDto.password, user.password);

      if (isMatch) {
        const payload: UserJwtPayload = {
          _id: user._id,
          username: user.username,
        };
        const accessToken = this.jwtService.sign(payload);
        return {
          success: true,
          message: 'Login success!',
          data: {
            _id: user._id,
          },
          token: accessToken,
          tokenExpiredIn: this.configService.get<number>(
            'userTokenExpiredTime',
          ),
        } as UserAuthResponse;
      } else {
        return {
          success: false,
          message: 'Password not matched!',
          data: null,
          token: null,
          tokenExpiredIn: null,
        } as UserAuthResponse;
      }
    } catch (error) {
      console.log(error);
      if (error.code && error.code.toString() === ErrorCodes.UNIQUE_FIELD) {
        throw new ConflictException('Username already exists');
      } else {
        throw new InternalServerErrorException();
      }
    }
  }

  async userLoginSocial(
    authUserDto: AuthSocialUserDto,
  ): Promise<UserAuthResponse> {
    try {
      const user = (await this.userModel
        .findOne({ username: authUserDto.username })
        .select('username hasAccess')) as User;

      if (!user) {
        return {
          success: false,
          message: 'No user data found!',
        } as UserAuthResponse;
      }

      if (!user.hasAccess) {
        return {
          success: false,
          message: 'No Access for Login',
        } as AdminAuthResponse;
      }

      const payload: UserJwtPayload = {
        _id: user._id,
        username: user.username,
      };
      const accessToken = this.jwtService.sign(payload);
      return {
        success: true,
        message: 'Login success!',
        data: {
          _id: user._id,
        },
        token: accessToken,
        tokenExpiredIn: this.configService.get<number>('userTokenExpiredTime'),
      } as UserAuthResponse;
    } catch (error) {
      console.log(error);
      if (error.code && error.code.toString() === ErrorCodes.UNIQUE_FIELD) {
        throw new ConflictException('Username already exists');
      } else {
        throw new InternalServerErrorException();
      }
    }
  }

  async userSignupAndLogin(
    createUserDto: CreateUserDto,
  ): Promise<UserAuthResponse> {
    try {
      const userData = await this.userModel.findOne({
        username: createUserDto.phoneNo,
      });
      if (userData) {
        return {
          success: false,
          message: 'Sorry! Phone no is already registered. Please Login',
          data: null,
          token: null,
          tokenExpiredIn: null,
        } as UserAuthResponse;
      } else {
        const { password } = createUserDto;
        const salt = await bcrypt.genSalt();
        const hashedPass = await bcrypt.hash(password, salt);

        const mData = {
          ...createUserDto,
          ...{ password: hashedPass, username: createUserDto.phoneNo },
        };
        const newUser = new this.userModel(mData);

        const saveData = await newUser.save();
        const authUserDto: AuthUserDto = {
          username: saveData.username,
          password: password,
        };
        // Cache Removed
        await this.cacheManager.del(this.cacheAllData);
        await this.cacheManager.del(this.cacheDataCount);

        return this.userLogin(authUserDto);
      }
    } catch (error) {
      console.log(error);
      if (error.code && error.code.toString() === ErrorCodes.UNIQUE_FIELD) {
        throw new ConflictException('Username already exists');
      } else {
        throw new InternalServerErrorException();
      }
    }
  }

  async userSignupAndLogin1(
    createUserDto: CreateUserDto,
  ): Promise<UserAuthResponse> {
    try {
      let query: any;
      if (createUserDto.registrationType === 'email') {
        query = { username: createUserDto.email };
      } else {
        query = { username: createUserDto.phoneNo };
      }
      const userData = await this.userModel.findOne(query);
      if (userData) {
        return {
          success: false,
          message: `Sorry! ${
            createUserDto.phoneNo ? 'Phone no' : 'Email'
          } is already registered. Please Login`,
          data: null,
          token: null,
          tokenExpiredIn: null,
        } as UserAuthResponse;
      } else {
        const { password } = createUserDto;
        const salt = await bcrypt.genSalt();
        const hashedPass = await bcrypt.hash(password, salt);

        const mData = {
          ...createUserDto,
          ...{
            password: hashedPass,
            username:
              createUserDto.registrationType === 'email'
                ? createUserDto.email
                : createUserDto.phoneNo,
            phone:
              createUserDto.registrationType === 'phone'
                ? createUserDto.phoneNo
                : null,
          },
        };
        const newUser = new this.userModel(mData);

        await newUser.save();
        const authUserDto: AuthUserDto = {
          username: mData.username,
          password: password,
        };

        // Cache Removed
        // await this.cacheManager.del(this.cacheAllData);
        // await this.cacheManager.del(this.cacheDataCount);

        return this.userLogin(authUserDto);
      }
    } catch (error) {
      console.log(error);
      if (error.code && error.code.toString() === ErrorCodes.UNIQUE_FIELD) {
        throw new ConflictException('Username already exists');
      } else {
        throw new InternalServerErrorException();
      }
    }
  }

  async userSignupAndLoginSocial(
    createUserDto: CreateSocialUserDto,
  ): Promise<UserAuthResponse> {
    try {
      const userData = await this.userModel.findOne({
        username: createUserDto.username,
      });

      if (userData) {
        const authUserDto: AuthSocialUserDto = {
          username: userData.username,
        };
        return this.userLoginSocial(authUserDto);
      } else {
        const newUser = new this.userModel(createUserDto);

        const saveData = await newUser.save();
        const authUserDto: AuthSocialUserDto = {
          username: saveData.username,
        };

        // Cache Removed
        await this.cacheManager.del(this.cacheAllData);
        await this.cacheManager.del(this.cacheDataCount);

        return this.userLoginSocial(authUserDto);
      }
    } catch (error) {
      console.log(error);
      if (error.code && error.code.toString() === ErrorCodes.UNIQUE_FIELD) {
        throw new ConflictException('Username already exists');
      } else {
        throw new InternalServerErrorException();
      }
    }
  }

  async checkUserForRegistration(
    checkUserRegistrationDto: CheckUserRegistrationDto,
  ): Promise<ResponsePayload> {
    try {
      const userData = await this.userModel.findOne({
        username: checkUserRegistrationDto.phoneNo,
      });
      if (userData) {
        // await this.otpService.generateOtpWithPhoneNo({
        //   phone: checkUserRegistrationDto.phone,
        // });
        return {
          success: true,
          message: 'Success! Otp has been sent to your phone number.',
          data: { username: userData.username, otp: true },
        } as ResponsePayload;
      } else {
        return {
          success: false,
          message: 'User not exists. Please check your phone number',
          data: { otp: false },
        } as ResponsePayload;
      }
    } catch (error) {
      console.log(error);
      if (error.code && error.code.toString() === ErrorCodes.UNIQUE_FIELD) {
        throw new ConflictException('Phone Number is already exists');
      } else {
        throw new InternalServerErrorException();
      }
    }
  }

  async checkUserForRegistration1(
    checkUserRegistrationDto: CheckUserRegistrationDto,
  ): Promise<ResponsePayload> {
    try {
      const userData = await this.userModel.findOne({
        username: checkUserRegistrationDto.username,
      });
      return {
        success: true,
        message: 'Success!',
        data: { hasUser: !!userData },
      } as ResponsePayload;
    } catch (error) {
      console.log(error);
      if (error.code && error.code.toString() === ErrorCodes.UNIQUE_FIELD) {
        throw new ConflictException('Phone Number is already exists');
      } else {
        throw new InternalServerErrorException();
      }
    }
  }

  /**
   * Logged-in User Info
   * Get All Users (Not Recommended)
   * Get All Users V3 (Filter, Pagination, Select, Sort, Search Query with Aggregation) ** Recommended
   * Get All Users by Search
   */
  async getLoggedInUserData(
    user: User,
    selectQuery: UserSelectFieldDto,
  ): Promise<ResponsePayload> {
    try {
      let { select } = selectQuery;
      if (!select) {
        select = '-password';
      }
      const data = await this.userModel.findById(user._id).select(select);
      return {
        data,
        success: true,
      } as ResponsePayload;
    } catch (err) {
      this.logger.error(`${user.username} is failed to retrieve data`);
      // console.log(err);
      throw new InternalServerErrorException();
    }
  }

  async getAllUsers(
    filterUserDto: FilterAndPaginationUserDto,
    searchQuery?: string,
  ): Promise<ResponsePayload> {
    const { filter } = filterUserDto;
    const { pagination } = filterUserDto;
    const { sort } = filterUserDto;
    const { select } = filterUserDto;

    /*** GET FROM CACHE ***/
    if (!pagination && !filter) {
      const cacheData: any[] = await this.cacheManager.get(this.cacheAllData);
      const count: number = await this.cacheManager.get(this.cacheDataCount);
      if (cacheData) {
        this.logger.log('Cached page');
        return {
          data: cacheData,
          success: true,
          message: 'Success',
          count: count,
        } as ResponsePayload;
      }
    }
    this.logger.log('Not a Cached page');

    // Modify Id as Object ID
    if (filter && filter['designation._id']) {
      filter['designation._id'] = new ObjectId(filter['designation._id']);
    }

    if (filter && filter['userType._id']) {
      filter['userType._id'] = new ObjectId(filter['userType._id']);
    }

    // Essential Variables
    const aggregateStages = [];
    let mFilter = {};
    let mSort = {};
    let mSelect = {};
    let mPagination = {};

    // Match
    if (filter) {
      mFilter = { ...mFilter, ...filter };
    }
    if (searchQuery) {
      mFilter = {
        $and: [
          mFilter,
          {
            $or: [
              { username: { $regex: searchQuery, $options: 'i' } },
              { phoneNo: { $regex: searchQuery, $options: 'i' } },
            ],
          },
        ],
      };
    }
    // Sort
    if (sort) {
      mSort = sort;
    } else {
      mSort = { createdAt: -1 };
    }

    // Select
    if (select) {
      // Remove Sensitive Select
      delete select.password;
      mSelect = { ...mSelect, ...select };
    } else {
      mSelect = { password: 0 };
    }

    // Finalize
    if (Object.keys(mFilter).length) {
      aggregateStages.push({ $match: mFilter });
    }

    if (Object.keys(mSort).length) {
      aggregateStages.push({ $sort: mSort });
    }

    if (!pagination) {
      aggregateStages.push({ $project: mSelect });
    }

    // Pagination
    if (pagination) {
      // Remove Sensitive Select
      delete mSelect['password'];
      if (Object.keys(mSelect).length) {
        mPagination = {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: [
              {
                $skip: pagination.pageSize * pagination.currentPage,
              } /* IF PAGE START FROM 0 OR (pagination.currentPage - 1) IF PAGE 1*/,
              { $limit: pagination.pageSize },
              { $project: mSelect },
            ],
          },
        };
      } else {
        mPagination = {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: [
              {
                $skip: pagination.pageSize * pagination.currentPage,
              } /* IF PAGE START FROM 0 OR (pagination.currentPage - 1) IF PAGE 1*/,
              { $limit: pagination.pageSize },
              { $project: { password: 0 } },
            ],
          },
        };
      }

      aggregateStages.push(mPagination);

      aggregateStages.push({
        $project: {
          data: 1,
          count: { $arrayElemAt: ['$metadata.total', 0] },
        },
      });
    }

    try {
      const dataAggregates = await this.userModel.aggregate(aggregateStages);
      if (pagination) {
        return {
          ...{ ...dataAggregates[0] },
          ...{ success: true, message: 'Success' },
        } as ResponsePayload;
      } else {
        /*** SET CACHE DATA**/
        if (!filter) {
          await this.cacheManager.set(this.cacheAllData, dataAggregates);
          await this.cacheManager.set(
            this.cacheDataCount,
            dataAggregates.length,
          );
          this.logger.log('Cache Added');
        }

        return {
          data: dataAggregates,
          success: true,
          message: 'Success',
          count: dataAggregates.length,
        } as ResponsePayload;
      }
    } catch (err) {
      this.logger.error(err);
      if (err.code && err.code.toString() === ErrorCodes.PROJECTION_MISMATCH) {
        throw new BadRequestException('Error! Projection mismatch');
      } else {
        throw new InternalServerErrorException();
      }
    }
  }

  /**
   * Get User by ID
   * Update User by Id
   * Delete User by Id
   */

  async getUserById(
    id: string,
    userSelectFieldDto: UserSelectFieldDto,
  ): Promise<ResponsePayload> {
    try {
      let { select } = userSelectFieldDto;
      if (!select) {
        select = '-password';
      }
      const data = await this.userModel.findById(id).select(select);
      return {
        success: true,
        message: 'Success',
        data,
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException();
    }
  }

  async updateLoggedInUserInfo(
    users: User,
    updateUserDto: UpdateUserDto,
  ): Promise<ResponsePayload> {
    const { password, username } = updateUserDto;
    let user;
    try {
      user = await this.userModel.findById(users._id);
    } catch (err) {
      throw new InternalServerErrorException();
    }
    if (!user) {
      throw new NotFoundException('No User found!');
    }
    try {
      // Check Username
      if (username) {
        const isExists = await this.userModel.findOne({ username });
        if (isExists) {
          return {
            success: false,
            message: 'Username already exists',
          } as ResponsePayload;
        }
      }

      // Cache Removed
      await this.cacheManager.del(this.cacheAllData);
      await this.cacheManager.del(this.cacheDataCount);

      // Check Password
      if (password) {
        const salt = await bcrypt.genSalt();
        const hashedPass = await bcrypt.hash(password, salt);
        await this.userModel.findByIdAndUpdate(users._id, {
          $set: { ...updateUserDto, ...{ password: hashedPass } },
        });
        return {
          success: true,
          message: 'Data & Password changed success',
        } as ResponsePayload;
      }
      await this.userModel.findByIdAndUpdate(users._id, {
        $set: updateUserDto,
      });
      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException();
    }
  }

  async changeLoggedInUserPassword(
    users: User,
    changePasswordDto: ChangePasswordDto,
  ): Promise<ResponsePayload> {
    const { password, oldPassword } = changePasswordDto;
    let user;
    try {
      user = await this.userModel.findById(users._id).select('password');
    } catch (err) {
      throw new InternalServerErrorException();
    }
    if (!user) {
      throw new NotFoundException('No User found!');
    }
    try {
      // Check Old Password
      const isMatch = await bcrypt.compare(oldPassword, user.password);

      // Change Password
      if (isMatch) {
        const salt = await bcrypt.genSalt();
        const hashedPass = await bcrypt.hash(password, salt);
        await this.userModel.findByIdAndUpdate(users._id, {
          $set: { password: hashedPass },
        });
        return {
          success: true,
          message: 'Password changed success',
        } as ResponsePayload;
      } else {
        return {
          success: false,
          message: 'Old password is incorrect!',
        } as ResponsePayload;
      }
    } catch (err) {
      console.log(err);
      throw new InternalServerErrorException();
    }
  }

  async checkUserAndSentOtp(
    checkUserDto: CheckUserDto,
  ): Promise<ResponsePayload> {
    try {
      const { phoneNo, email } = checkUserDto;
      let user;
      if (phoneNo && !email) {
        user = await this.userModel.findOne({ phone: phoneNo });
      }

      if (!phoneNo && email) {
        user = await this.userModel.findOne({ email: email });
      }

      return {
        success: false,
        message: 'User no exists',
      } as ResponsePayload;

      // if (user) {
      //   if (phone) {
      //     return this.otpService.generateOtpWithPhoneNo({ phone });
      //   }
      // } else {
      //   return {
      //     success: false,
      //     message: 'User no exists',
      //   } as ResponsePayload;
      // }
    } catch (err) {
      console.log(err);
      throw new InternalServerErrorException();
    }
  }

  async resetUserPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<ResponsePayload> {
    const { password, username } = resetPasswordDto;
    let user;
    try {
      user = await this.userModel
        .findOne({ username: username })
        .select('password');
    } catch (err) {
      throw new InternalServerErrorException();
    }
    if (!user) {
      throw new NotFoundException('No User found!');
    }
    try {
      const salt = await bcrypt.genSalt();
      const hashedPass = await bcrypt.hash(password, salt);
      await this.userModel.findByIdAndUpdate(user._id, {
        $set: { password: hashedPass },
      });
      return {
        success: true,
        message: 'Password reset success',
      } as ResponsePayload;
    } catch (err) {
      console.log(err);
      throw new InternalServerErrorException();
    }
  }

  async updateUserById(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<ResponsePayload> {
    const { newPassword, username } = updateUserDto;
    let user;
    try {
      user = await this.userModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException();
    }
    if (!user) {
      throw new NotFoundException('No user found!');
    }
    try {
      // Check Username
      if (username) {
        if (user.username !== username) {
          const isExists = await this.userModel.findOne({ username });
          if (isExists) {
            return {
              success: false,
              message: 'Username already exists',
            } as ResponsePayload;
          }
        }
      }
      // Cache Removed
      await this.cacheManager.del(this.cacheAllData);
      await this.cacheManager.del(this.cacheDataCount);

      // Check Password
      if (newPassword) {
        const salt = await bcrypt.genSalt();
        const hashedPass = await bcrypt.hash(newPassword, salt);
        await this.userModel.findByIdAndUpdate(id, {
          $set: { ...updateUserDto, ...{ password: hashedPass } },
        });
        return {
          success: true,
          message: 'Data & Password changed success',
        } as ResponsePayload;
      }
      // Delete No Action Data
      delete updateUserDto.password;
      await this.userModel.findByIdAndUpdate(id, {
        $set: updateUserDto,
      });
      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException();
    }
  }

  async deleteUserById(id: string): Promise<ResponsePayload> {
    let user;
    try {
      user = await this.userModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException();
    }
    if (!user) {
      throw new NotFoundException('No User found!');
    }
    try {
      await this.userModel.findByIdAndDelete(id);
      // Cache Removed
      await this.cacheManager.del(this.cacheAllData);
      await this.cacheManager.del(this.cacheDataCount);

      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException();
    }
  }

  async deleteMultipleUserById(
    ids: string[],
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    try {
      const mIds = ids.map((m) => new ObjectId(m));
      await this.userModel.deleteMany({ _id: mIds });
      // Cache Removed
      await this.cacheManager.del(this.cacheAllData);
      await this.cacheManager.del(this.cacheDataCount);

      // Reset Product Category Reference
      // if (checkUsage) {
      //   const defaultData = await this.taskModel.findOne({
      //     readOnly: true,
      //   });
      //   const resetData = {
      //     task: {
      //       _id: defaultData._id,
      //       name: defaultData.name,
      //     },
      //   };
      //
      //   // Update Product
      //   await this.userModel.updateMany(
      //     { 'task._id': { $in: mIds } },
      //     { $set: resetData },
      //   );
      // }
      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  /**
   * Additional Methods
   * followUnfollowAuthor()
   */

  async followUnfollowAuthor(
    user: User,
    followUnfollowAuthor: FollowUnfollowAuthor,
  ): Promise<ResponsePayload> {
    try {
      if (followUnfollowAuthor.type === 'follow') {
        await this.authorModel.findByIdAndUpdate(
          followUnfollowAuthor.author,
          {
            $addToSet: { followers: user._id },
          },
          { new: true, upsert: true },
        );
        await this.userModel.findByIdAndUpdate(
          user._id,
          {
            $addToSet: { authors: followUnfollowAuthor.author },
          },
          { new: true, upsert: true },
        );
      } else if (followUnfollowAuthor.type === 'unfollow') {
        await this.authorModel.findByIdAndUpdate(followUnfollowAuthor.author, {
          $pull: { followers: { $in: new ObjectId(user._id) } },
        });

        await this.userModel.findByIdAndUpdate(user._id, {
          $pull: {
            authors: { $in: new ObjectId(followUnfollowAuthor.author) },
          },
        });
      }

      return {
        success: true,
        message: `${
          followUnfollowAuthor.type === 'follow'
            ? 'Author added to your follow list'
            : 'Author remove from your follow list'
        }`,
        data: null,
      } as ResponsePayload;
    } catch (err) {
      console.log(err);
      throw new InternalServerErrorException(err.message);
    }
  }

  async getFollowedAuthorListByUser(user: User): Promise<ResponsePayload> {
    try {
      const data = await this.userModel.findById(user._id).populate({
        path: 'authors',
        select: 'name slug image',
      });

      const mData = JSON.parse(JSON.stringify(data));

      return {
        success: true,
        message: 'Success',
        data: mData?.authors && mData?.authors.length ? mData?.authors : [],
      } as ResponsePayload;
    } catch (err) {
      console.log(err);
      throw new InternalServerErrorException(err.message);
    }
  }

  async checkFollowedAuthorByUser(
    user: User,
    author: string,
  ): Promise<ResponsePayload> {
    try {
      const data = await this.userModel.findOne({
        user: user._id,
        author: { $in: new ObjectId(author) },
      });

      return {
        success: true,
        message: 'Success',
        data: !!data,
      } as ResponsePayload;
    } catch (err) {
      console.log(err);
      throw new InternalServerErrorException(err.message);
    }
  }

  /**
   * Address control
   * addNewAddress()
   * updateAddressById()
   */

  async addNewAddress(
    user: User,
    addAddressDto: AddAddressDto,
  ): Promise<ResponsePayload> {
    try {
      const final = { ...addAddressDto, ...{ user: user._id } };
      const newAddress = new this.addressModel(final);
      const address: any = await newAddress.save();
      await this.userModel.findOneAndUpdate(
        { _id: user._id },
        { $push: { addresses: address._id, division: address.division } },
      );

      return {
        success: true,
        message: 'Address added successfully',
        data: {
          _id: address._id,
        },
      } as ResponsePayload;
    } catch (err) {
      console.log(err);
      throw new InternalServerErrorException();
    }
  }

  async setDefaultAddressById(
    user: User,
    id: string,
  ): Promise<ResponsePayload> {
    try {
      await this.addressModel.updateOne(
        { _id: id },
        { $set: { setDefaultAddress: true } },
      );

      await this.addressModel.updateMany(
        {
          user: user._id,
          _id: { $nin: new ObjectId(id) },
        },
        {
          $set: { setDefaultAddress: false },
        },
      );

      return {
        success: true,
        message: 'Address updated Successfully!',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException();
    }
  }

  async updateAddressById(
    id: string,
    updateAddressDto: UpdateAddressDto,
  ): Promise<ResponsePayload> {
    try {
      await this.addressModel.updateOne(
        { _id: id },
        { $set: updateAddressDto },
      );

      return {
        success: true,
        message: 'Address updated Successfully!',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException();
    }
  }

  async getAllAddress(user: User): Promise<ResponsePayload> {
    try {
      const data = await this.userModel
        .findOne({ _id: user._id })
        .select('addresses -_id')
        .populate({
          path: 'addresses',
          model: 'Address',
          options: {
            sort: { createdAt: -1 },
          },
        });

      return {
        success: true,
        message: 'Address Get Successfully!',
        data:
          data && data['addresses'] && data['addresses'].length
            ? data['addresses']
            : [],
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException();
    }
  }

  async deleteAddressById(id: string, user: User): Promise<ResponsePayload> {
    try {
      await this.addressModel.deleteOne({ _id: id });

      await this.userModel.findByIdAndUpdate(
        { _id: user._id },
        { $pull: { addresses: id } },
      );

      return {
        success: true,
        message: 'Address deleted Successfully!',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException();
    }
  }
}
