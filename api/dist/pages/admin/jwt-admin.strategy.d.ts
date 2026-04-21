import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AdminJwtPayload } from '../../interfaces/admin/admin.interface';
declare const JwtAdminStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtAdminStrategy extends JwtAdminStrategy_base {
    private configService;
    constructor(configService: ConfigService);
    validate(payload: AdminJwtPayload): Promise<{
        _id: string;
        username: string;
        role: import("../../enum/admin-roles.enum").AdminRoles;
        permissions: import("../../enum/admin-permission.enum").AdminPermissions[];
    }>;
}
export {};
