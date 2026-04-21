import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminJwtPayload } from '../../interfaces/admin/admin.interface';
import { PASSPORT_ADMIN_TOKEN_TYPE } from '../../core/global-variables';

@Injectable()
export class JwtAdminStrategy extends PassportStrategy(
  Strategy,
  PASSPORT_ADMIN_TOKEN_TYPE,
) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromHeader('administrator'),
      // jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('adminJwtSecret'),
    });
  }

  async validate(payload: AdminJwtPayload) {
    return {
      _id: payload._id,
      username: payload.username,
      role: payload.role,
      permissions: payload.permissions,
    };
  }
}
