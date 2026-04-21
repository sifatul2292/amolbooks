import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Admin, AdminAuthResponse } from '../../interfaces/admin/admin.interface';
import { AdminSelectFieldDto, AuthAdminDto, CreateAdminDto, FilterAndPaginationAdminDto, UpdateAdminDto } from '../../dto/admin.dto';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { ChangePasswordDto } from '../../dto/change-password.dto';
import { UtilsService } from '../../shared/utils/utils.service';
export declare class AdminService {
    private readonly adminModel;
    protected jwtService: JwtService;
    private configService;
    private utilsService;
    private logger;
    constructor(adminModel: Model<Admin>, jwtService: JwtService, configService: ConfigService, utilsService: UtilsService);
    adminSignup(createAdminDto: CreateAdminDto): Promise<ResponsePayload>;
    adminLogin(authAdminDto: AuthAdminDto): Promise<AdminAuthResponse>;
    getLoggedInAdminData(admin: Admin, selectQuery: AdminSelectFieldDto): Promise<ResponsePayload>;
    getAllAdmins(filterAdminDto: FilterAndPaginationAdminDto, searchQuery?: string): Promise<ResponsePayload>;
    getAdminsBySearch(searchQuery: string, selectQuery?: AdminSelectFieldDto): Promise<Admin[]>;
    getAdminById(id: string, adminSelectFieldDto: AdminSelectFieldDto): Promise<ResponsePayload>;
    updateLoggedInAdminInfo(admin: Admin, updateAdminDto: UpdateAdminDto): Promise<ResponsePayload>;
    changeLoggedInAdminPassword(admind: Admin, changePasswordDto: ChangePasswordDto): Promise<ResponsePayload>;
    updateAdminById(id: string, updateAdminDto: UpdateAdminDto): Promise<ResponsePayload>;
    updateMultipleAdminById(ids: string[], updateAdminDto: UpdateAdminDto): Promise<ResponsePayload>;
    deleteAdminById(id: string): Promise<ResponsePayload>;
    deleteMultipleAdminById(ids: string[]): Promise<ResponsePayload>;
}
