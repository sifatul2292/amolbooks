import { Module } from '@nestjs/common';
import { RedirectUrlService } from './redirect-url.service';
import { RedirectUrlController } from './redirect-url.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { RedirectUrlSchema } from '../../schema/redirect-url.schema';
import { UserSchema } from '../../schema/user.schema';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'RedirectUrl', schema: RedirectUrlSchema },
      { name: 'User', schema: UserSchema },
    ]),
  ],
  providers: [RedirectUrlService],
  controllers: [RedirectUrlController],
})
export class RedirectUrlModule {}
