import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { UserSchema } from '../../schema/user.schema';
import { JwtUserStrategy } from './jwt-user.strategy';
import { PASSPORT_USER_TOKEN_TYPE } from '../../core/global-variables';
import { PromoOfferSchema } from '../../schema/promo-offer.schema';
import { AuthorSchema } from '../../schema/author.schema';
import { AddressSchema } from "../../schema/address.schema";

@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: PASSPORT_USER_TOKEN_TYPE,
      property: 'user',
      session: false,
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('userJwtSecret'),
        signOptions: {
          expiresIn: configService.get<number>('userTokenExpiredTime'),
        },
      }),
    }),
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'PromoOffer', schema: PromoOfferSchema },
      { name: 'Author', schema: AuthorSchema },
      { name: 'Address', schema: AddressSchema },
    ]),
  ],
  controllers: [UserController],
  providers: [UserService, JwtUserStrategy],
  exports: [PassportModule],
})
export class UserModule {}
