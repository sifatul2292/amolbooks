import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  Admin,
  AdminAuthResponse,
  AdminJwtPayload,
} from '../../interfaces/admin/admin.interface';
import { ErrorCodes } from '../../enum/error-code.enum';
import * as bcrypt from 'bcrypt';
import {
  AdminSelectFieldDto,
  AuthAdminDto,
  CreateAdminDto,
  FilterAndPaginationAdminDto,
  UpdateAdminDto,
} from '../../dto/admin.dto';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { ChangePasswordDto } from '../../dto/change-password.dto';
import { UtilsService } from '../../shared/utils/utils.service';

const ObjectId = Types.ObjectId;

@Injectable()
export class AdminService {
  private logger = new Logger(AdminService.name);

  constructor(
    @InjectModel('Admin') private readonly adminModel: Model<Admin>,
    protected jwtService: JwtService,
    private configService: ConfigService,
    private utilsService: UtilsService,
  ) {}

  /**
   * Admin Signup
   * Admin Login
   */
  async adminSignup(createAdminDto: CreateAdminDto): Promise<ResponsePayload> {
    const { password } = createAdminDto;
    const salt = await bcrypt.genSalt();
    const hashedPass = await bcrypt.hash(password, salt);

    const defaultData = {
      password: hashedPass,
      readOnly: false,
      registrationAt: this.utilsService.getDateString(new Date()),
      lastLoggedIn: null,
    };
    const mData = { ...createAdminDto, ...defaultData };
    const newUser = new this.adminModel(mData);
    try {
      const saveData = await newUser.save();
      const data = {
        username: saveData.username,
        name: saveData.name,
        _id: saveData._id,
      };
      return {
        success: true,
        message: 'Registration Success',
        data,
      } as ResponsePayload;
    } catch (error) {
      console.log(error);
      if (error.code && error.code.toString() === ErrorCodes.UNIQUE_FIELD) {
        throw new ConflictException('Username already exists');
      } else {
        throw new InternalServerErrorException();
      }
    }
  }

  async adminLogin(authAdminDto: AuthAdminDto): Promise<AdminAuthResponse> {
    try {
      const user = (await this.adminModel
        .findOne({ username: authAdminDto.username })
        .select('password username role permissions hasAccess')) as Admin;

      if (!user) {
        return {
          success: false,
          message: 'Username is invalid',
        } as AdminAuthResponse;
      }

      if (!user.hasAccess) {
        return {
          success: false,
          message: 'No Access for Login',
        } as AdminAuthResponse;
      }

      const isMatch = await bcrypt.compare(
        authAdminDto.password,
        user.password,
      );

      if (isMatch) {
        const payload: AdminJwtPayload = {
          _id: user._id,
          username: user.username,
          role: user.role,
          permissions: user.permissions,
        };
        const accessToken = this.jwtService.sign(payload);
        // Update Login Info
        await this.adminModel.findByIdAndUpdate(user._id, {
          $set: {
            lastLoggedIn: this.utilsService.getDateWithCurrentTime(new Date()),
          },
        });

        return {
          success: true,
          message: 'Login success!',
          data: {
            _id: user._id,
            role: user.role,
            permissions: user.permissions,
          },
          token: accessToken,
          tokenExpiredIn: this.configService.get<number>(
            'adminTokenExpiredTime',
          ),
        } as AdminAuthResponse;
      } else {
        return {
          success: false,
          message: 'Password not matched!',
          data: null,
          token: null,
          tokenExpiredIn: null,
        } as AdminAuthResponse;
      }
    } catch (error) {
      if (error.code && error.code.toString() === ErrorCodes.UNIQUE_FIELD) {
        throw new ConflictException('Username already exists');
      } else {
        throw new InternalServerErrorException(error.message);
      }
    }
  }

  /**
   * Logged-in Admin Info
   * Get All Admins V3 (Filter, Pagination, Select, Sort, Search Query with Aggregation) ** Recommended
   * Get All Admins by Search
   */

  async getLoggedInAdminData(
    admin: Admin,
    selectQuery: AdminSelectFieldDto,
  ): Promise<ResponsePayload> {
    try {
      let { select } = selectQuery;
      if (!select) {
        select = '-password';
      }
      const data = await this.adminModel.findById(admin._id).select(select);
      return {
        data,
        success: true,
      } as ResponsePayload;
    } catch (err) {
      this.logger.error(`${admin.username} is failed to retrieve data`);
      // console.log(err);
      throw new InternalServerErrorException();
    }
  }

  async getAllAdmins(
    filterAdminDto: FilterAndPaginationAdminDto,
    searchQuery?: string,
  ): Promise<ResponsePayload> {
    const { filter } = filterAdminDto;
    const { pagination } = filterAdminDto;
    const { sort } = filterAdminDto;
    const { select } = filterAdminDto;

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
      mFilter = { ...mFilter, ...{ name: new RegExp(searchQuery, 'i') } };
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
      const dataAggregates = await this.adminModel.aggregate(aggregateStages);
      if (pagination) {
        return {
          ...{ ...dataAggregates[0] },
          ...{ success: true, message: 'Success' },
        } as ResponsePayload;
      } else {
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

  async getAdminsBySearch(
    searchQuery: string,
    selectQuery?: AdminSelectFieldDto,
  ): Promise<Admin[]> {
    const newQuery = searchQuery.split(/[ ,]+/);
    const queryArray = newQuery.map((str) => ({ name: RegExp(str, 'i') }));
    const queryArray2 = newQuery.map((str) => ({ email: RegExp(str, 'i') }));
    const queryArray3 = newQuery.map((str) => ({ phoneNo: RegExp(str, 'i') }));
    const queryArray4 = newQuery.map((str) => ({ username: RegExp(str, 'i') }));
    try {
      return await this.adminModel
        .find({
          $or: [
            { $and: queryArray },
            { $and: queryArray2 },
            { $and: queryArray3 },
            { $and: queryArray4 },
          ],
        })
        .limit(20)
        .select(selectQuery ? selectQuery.select : '-password');
    } catch (err) {
      throw new InternalServerErrorException();
    }
  }

  /**
   * Get Admin by ID
   * Update Logged In Admin Info
   * Change Logged In Admin Password
   * Update Admin by Id
   * Update Multiple Admin By Id
   * Delete Admin by Id
   * Delete Multiple Admin By Id
   */
  async getAdminById(
    id: string,
    adminSelectFieldDto: AdminSelectFieldDto,
  ): Promise<ResponsePayload> {
    try {
      let { select } = adminSelectFieldDto;
      if (!select) {
        select = '-password';
      }
      const data = await this.adminModel.findById(id).select(select);
      return {
        success: true,
        message: 'Success',
        data,
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException();
    }
  }

  async updateLoggedInAdminInfo(
    admin: Admin,
    updateAdminDto: UpdateAdminDto,
  ): Promise<ResponsePayload> {
    const { password, username } = updateAdminDto;
    let user;
    try {
      user = await this.adminModel.findById(admin._id);
    } catch (err) {
      throw new InternalServerErrorException();
    }
    if (!user) {
      throw new NotFoundException('No Admin found!');
    }
    try {
      // Remove Sensitive Fields
      if (updateAdminDto.role) {
        delete updateAdminDto.role;
      }
      if (updateAdminDto.permissions) {
        delete updateAdminDto.permissions;
      }

      // Check Username
      if (username) {
        const isExists = await this.adminModel.findOne({ username });
        if (isExists) {
          return {
            success: false,
            message: 'Username already exists',
          } as ResponsePayload;
        }
      }
      // Check Password
      if (password) {
        const salt = await bcrypt.genSalt();
        const hashedPass = await bcrypt.hash(password, salt);
        await this.adminModel.findByIdAndUpdate(admin._id, {
          $set: { ...updateAdminDto, ...{ password: hashedPass } },
        });
        return {
          success: true,
          message: 'Data & Password changed success',
        } as ResponsePayload;
      }
      await this.adminModel.findByIdAndUpdate(admin._id, {
        $set: updateAdminDto,
      });
      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException();
    }
  }

  async changeLoggedInAdminPassword(
    admind: Admin,
    changePasswordDto: ChangePasswordDto,
  ): Promise<ResponsePayload> {
    const { password, oldPassword } = changePasswordDto;
    let admin;
    try {
      admin = await this.adminModel.findById(admind._id).select('password');
    } catch (err) {
      throw new InternalServerErrorException();
    }
    if (!admin) {
      throw new NotFoundException('No Admin found!');
    }
    try {
      // Check Old Password
      const isMatch = await bcrypt.compare(oldPassword, admin.password);

      // Change Password
      if (isMatch) {
        const salt = await bcrypt.genSalt();
        const hashedPass = await bcrypt.hash(password, salt);
        await this.adminModel.findByIdAndUpdate(admin._id, {
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

  async updateAdminById(
    id: string,
    updateAdminDto: UpdateAdminDto,
  ): Promise<ResponsePayload> {
    const { newPassword, username } = updateAdminDto;
    let user;
    try {
      user = await this.adminModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException();
    }
    if (!user) {
      throw new NotFoundException('No Admin found!');
    }
    try {
      // Delete No Multiple Action Data
      if (updateAdminDto.password) {
        delete updateAdminDto.password;
      }

      // Check Username
      if (username) {
        if (user.username !== username) {
          const isExists = await this.adminModel.findOne({ username });
          if (isExists) {
            return {
              success: false,
              message: 'Username already exists',
            } as ResponsePayload;
          }
        }
      }
      // Check Password
      if (newPassword) {
        const salt = await bcrypt.genSalt();
        const hashedPass = await bcrypt.hash(newPassword, salt);
        await this.adminModel.findByIdAndUpdate(id, {
          $set: { ...updateAdminDto, ...{ password: hashedPass } },
        });
        return {
          success: true,
          message: 'Data & Password changed success',
        } as ResponsePayload;
      }
      await this.adminModel.findByIdAndUpdate(id, {
        $set: updateAdminDto,
      });
      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException();
    }
  }

  async updateMultipleAdminById(
    ids: string[],
    updateAdminDto: UpdateAdminDto,
  ): Promise<ResponsePayload> {
    const mIds = ids.map((m) => new ObjectId(m));

    // Delete No Multiple Action Data
    if (updateAdminDto.password) {
      delete updateAdminDto.password;
    }
    if (updateAdminDto.username) {
      delete updateAdminDto.username;
    }
    if (updateAdminDto.ids) {
      delete updateAdminDto.ids;
    }

    try {
      await this.adminModel.updateMany(
        { _id: { $in: mIds } },
        { $set: updateAdminDto },
      );

      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async deleteAdminById(id: string): Promise<ResponsePayload> {
    let user;
    try {
      user = await this.adminModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException();
    }
    if (!user) {
      throw new NotFoundException('No Admin found!');
    }
    try {
      await this.adminModel.findByIdAndDelete(id);
      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException();
    }
  }

  async deleteMultipleAdminById(ids: string[]): Promise<ResponsePayload> {
    try {
      await this.adminModel.deleteMany({ _id: ids });
      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }
}
