import { SetMetadata } from '@nestjs/common';
import { AdminPermissions } from '../enum/admin-permission.enum';

export const ADMIN_PERMISSIONS_KEY = 'adminPermissions';
export const AdminMetaPermissions = (...permissions: AdminPermissions[]) =>
  SetMetadata(ADMIN_PERMISSIONS_KEY, permissions);
