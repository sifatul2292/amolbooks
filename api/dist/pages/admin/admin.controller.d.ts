import { AdminService } from './admin.service';
import { AdminSelectFieldDto, AuthAdminDto, CreateAdminDto, FilterAndPaginationAdminDto, UpdateAdminDto } from '../../dto/admin.dto';
import { Admin, AdminAuthResponse } from '../../interfaces/admin/admin.interface';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { ChangePasswordDto } from '../../dto/change-password.dto';
export declare class AdminController {
    private adminService;
    private logger;
    constructor(adminService: AdminService);
    adminSignup(createAdminDto: CreateAdminDto): Promise<ResponsePayload>;
    adminLogin(authAdminDto: AuthAdminDto): Promise<AdminAuthResponse>;
    getLoggedInAdminData(adminSelectFieldDto: AdminSelectFieldDto, admin: Admin): Promise<ResponsePayload>;
    getAllAdmins(filterAdminDto: FilterAndPaginationAdminDto, searchString: string): Promise<ResponsePayload>;
    getAdminsBySearch(searchString: string, adminSelectFieldDto: AdminSelectFieldDto): Promise<Admin[]>;
    getAdminById(id: string, adminSelectFieldDto: AdminSelectFieldDto): Promise<ResponsePayload>;
    updateLoggedInAdminInfo(admin: Admin, updateAdminDto: UpdateAdminDto): Promise<ResponsePayload>;
    changeLoggedInAdminPassword(admin: Admin, changePasswordDto: ChangePasswordDto): Promise<ResponsePayload>;
    updateAdminById(id: string, updateAdminDto: UpdateAdminDto): Promise<ResponsePayload>;
    updateMultipleAdminById(updateAdminDto: UpdateAdminDto): Promise<ResponsePayload>;
    deleteAdminById(id: string): Promise<ResponsePayload>;
    deleteMultipleAdminById(data: {
        ids: string[];
    }): Promise<ResponsePayload>;
}
