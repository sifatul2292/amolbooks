import { AdminPermissions } from '../enum/admin-permission.enum';
export declare const ADMIN_PERMISSIONS_KEY = "adminPermissions";
export declare const AdminMetaPermissions: (...permissions: AdminPermissions[]) => import("@nestjs/common").CustomDecorator<string>;
