import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { AddressSchema } from '../../schema/address.schema';
import { OrderSchema } from '../../schema/order.schema';
import { ProductSchema } from '../../schema/product.schema';
import { ReviewSchema } from '../../schema/review.schema';
import { UserSchema } from '../../schema/user.schema';
import { WhatsappChatSchema } from '../../shared/whatsapp/whatsapp-chat.schema';
import { GuestOrdersModule } from '../guest-orders/guest-orders.module';
import { ReviewLoginService } from './review-login.service';
import { ReviewRequestController, StorefrontPageController } from './review-request.controller';
import { ReviewRequestService } from './review-request.service';
import { ReviewRequestSettingSchema } from './review-request-setting.schema';

/**
 * WhatsApp review request 14 days after delivery, its review page and the page's SMS-code login
 * (WhatsappService is global; the code comes from GuestOrdersService; customer tokens are signed
 * like UserModule's).
 */
@Module({
  imports: [
    GuestOrdersModule,
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
      { name: 'Order', schema: OrderSchema },
      { name: 'Product', schema: ProductSchema },
      { name: 'Review', schema: ReviewSchema },
      { name: 'WhatsappChat', schema: WhatsappChatSchema },
      { name: 'User', schema: UserSchema },
      { name: 'Address', schema: AddressSchema },
      { name: 'ReviewRequestSetting', schema: ReviewRequestSettingSchema },
    ]),
  ],
  controllers: [ReviewRequestController, StorefrontPageController],
  providers: [ReviewRequestService, ReviewLoginService],
})
export class ReviewRequestModule {}
