import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Admin } from '../interfaces/admin/admin.interface';

export const GetAdmin = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Admin => {
    const request = ctx.switchToHttp().getRequest();
    // Passport JWT strategy sets admin in request.user by default
    // Check both request.admin and request.user (similar to guards)
    return request.admin || request.user;
  },
);
