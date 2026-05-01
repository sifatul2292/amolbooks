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
import { AdminService } from './admin.service';
import {
  AdminSelectFieldDto,
  AuthAdminDto,
  CreateAdminDto,
  FilterAndPaginationAdminDto,
  UpdateAdminDto,
} from '../../dto/admin.dto';
import {
  Admin,
  AdminAuthResponse,
} from '../../interfaces/admin/admin.interface';
import { AuthGuard } from '@nestjs/passport';
import { GetAdmin } from '../../decorator/get-admin.decorator';
import { MongoIdValidationPipe } from '../../pipes/mongo-id-validation.pipe';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { AdminMetaPermissions } from '../../decorator/admin-permissions.decorator';
import { AdminPermissions } from '../../enum/admin-permission.enum';
import { AdminPermissionGuard } from '../../guards/admin-permission.guard';
import { PASSPORT_ADMIN_TOKEN_TYPE } from '../../core/global-variables';
import { AdminMetaRoles } from '../../decorator/admin-roles.decorator';
import { AdminRoles } from '../../enum/admin-roles.enum';
import { AdminRolesGuard } from '../../guards/admin-roles.guard';
import { AdminJwtAuthGuard } from '../../guards/admin-jwt-auth.guard';
import { ChangePasswordDto } from '../../dto/change-password.dto';

@Controller('admin')
export class AdminController {
  private logger = new Logger(AdminController.name);

  constructor(private adminService: AdminService) {}

  /**
   * Admin Signup
   * Admin Login
   */

  @Post('/signup')
  @UsePipes(ValidationPipe)
  // @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  // @UseGuards(AdminRolesGuard)
  // @AdminMetaPermissions(AdminPermissions.CREATE)
  // @UseGuards(AdminPermissionGuard)
  // @UseGuards(AdminJwtAuthGuard)
  async adminSignup(
    @Body()
    createAdminDto: CreateAdminDto,
  ): Promise<ResponsePayload> {
    return await this.adminService.adminSignup(createAdminDto);
  }

  @Post('/login')
  @Throttle(5, 60)
  @UsePipes(ValidationPipe)
  async adminLogin(
    @Body() authAdminDto: AuthAdminDto,
  ): Promise<AdminAuthResponse> {
    return await this.adminService.adminLogin(authAdminDto);
  }

  @Version(VERSION_NEUTRAL)
  @Get('/logged-in-admin-data')
  @UseGuards(AuthGuard(PASSPORT_ADMIN_TOKEN_TYPE))
  async getLoggedInAdminData(
    @Query(ValidationPipe) adminSelectFieldDto: AdminSelectFieldDto,
    @GetAdmin() admin: Admin,
  ): Promise<ResponsePayload> {
    return this.adminService.getLoggedInAdminData(admin, adminSelectFieldDto);
  }

  @Version(VERSION_NEUTRAL)
  @Post('/all-admins')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN)
  @UseGuards(AdminRolesGuard)
  @UseGuards(AdminJwtAuthGuard)
  async getAllAdmins(
    @Body() filterAdminDto: FilterAndPaginationAdminDto,
    @Query('q') searchString: string,
  ): Promise<ResponsePayload> {
    return this.adminService.getAllAdmins(filterAdminDto, searchString);
  }

  @Version(VERSION_NEUTRAL)
  @Get('/admins-by-search')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN)
  @UseGuards(AdminRolesGuard)
  @UseGuards(AdminJwtAuthGuard)
  async getAdminsBySearch(
    @Query('q') searchString: string,
    @Query(ValidationPipe) adminSelectFieldDto: AdminSelectFieldDto,
  ): Promise<Admin[]> {
    return this.adminService.getAdminsBySearch(
      searchString,
      adminSelectFieldDto,
    );
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

  @Version(VERSION_NEUTRAL)
  @Get('/:id')
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN)
  @UseGuards(AdminRolesGuard)
  @UseGuards(AdminJwtAuthGuard)
  async getAdminById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query(ValidationPipe) adminSelectFieldDto: AdminSelectFieldDto,
  ): Promise<ResponsePayload> {
    return await this.adminService.getAdminById(id, adminSelectFieldDto);
  }

  @Version(VERSION_NEUTRAL)
  @Put('/update-logged-in-admin')
  @UsePipes(ValidationPipe)
  @UseGuards(AuthGuard(PASSPORT_ADMIN_TOKEN_TYPE))
  async updateLoggedInAdminInfo(
    @GetAdmin() admin: Admin,
    @Body() updateAdminDto: UpdateAdminDto,
  ): Promise<ResponsePayload> {
    return await this.adminService.updateLoggedInAdminInfo(
      admin,
      updateAdminDto,
    );
  }

  @Version(VERSION_NEUTRAL)
  @Put('/change-logged-in-admin-password')
  @UsePipes(ValidationPipe)
  @UseGuards(AuthGuard(PASSPORT_ADMIN_TOKEN_TYPE))
  async changeLoggedInAdminPassword(
    @GetAdmin() admin: Admin,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<ResponsePayload> {
    return await this.adminService.changeLoggedInAdminPassword(
      admin,
      changePasswordDto,
    );
  }

  @Version(VERSION_NEUTRAL)
  @Put('/update-admin/:id')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async updateAdminById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() updateAdminDto: UpdateAdminDto,
  ): Promise<ResponsePayload> {
    return await this.adminService.updateAdminById(id, updateAdminDto);
  }

  @Version(VERSION_NEUTRAL)
  @Put('/update-multiple-admin-by-id')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async updateMultipleAdminById(
    @Body() updateAdminDto: UpdateAdminDto,
  ): Promise<ResponsePayload> {
    return await this.adminService.updateMultipleAdminById(
      updateAdminDto.ids,
      updateAdminDto,
    );
  }

  @Version(VERSION_NEUTRAL)
  @Delete('/delete-admin/:id')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.DELETE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async deleteAdminById(
    @Param('id', MongoIdValidationPipe) id: string,
  ): Promise<ResponsePayload> {
    return await this.adminService.deleteAdminById(id);
  }

  @Version(VERSION_NEUTRAL)
  @Post('/delete-multiple-admin-by-id')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.DELETE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async deleteMultipleAdminById(
    @Body() data: { ids: string[] },
  ): Promise<ResponsePayload> {
    return await this.adminService.deleteMultipleAdminById(data.ids);
  }
}
