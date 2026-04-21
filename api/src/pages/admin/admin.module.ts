import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminSchema } from '../../schema/admin.schema';
import { JwtAdminStrategy } from './jwt-admin.strategy';
import { PASSPORT_ADMIN_TOKEN_TYPE } from '../../core/global-variables';

@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: PASSPORT_ADMIN_TOKEN_TYPE,
      property: 'admin',
      session: false,
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('adminJwtSecret'),
        signOptions: {
          expiresIn: configService.get<number>('adminTokenExpiredTime'),
        },
      }),
    }),
    MongooseModule.forFeature([{ name: 'Admin', schema: AdminSchema }]),
  ],
  controllers: [AdminController],
  providers: [AdminService, JwtAdminStrategy],
  exports: [PassportModule],
})
export class AdminModule {}
