import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ADMIN_PERMISSIONS_KEY } from '../decorator/admin-permissions.decorator';

@Injectable()
export class AdminPermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permissions = this.reflector.get<string[]>(
      ADMIN_PERMISSIONS_KEY,
      context.getHandler(),
    );
    if (!permissions) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    let user;
    // *Important* When the user jwt strategy get data from request.user
    // *Important* When the admin jwt strategy get data from request.admin
    if (request.admin) {
      user = request.admin;
    } else if (request.user) {
      user = request.user;
    } else {
      user = undefined;
    }
    if (user?.permissions.includes(permissions[0])) {
      return user?.permissions.includes(permissions[0]);
    } else {
      throw new UnauthorizedException(
        'This role does not have permission for this advanced action.',
      );
    }
  }
}
