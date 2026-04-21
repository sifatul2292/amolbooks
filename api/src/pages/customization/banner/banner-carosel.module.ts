import { Module } from '@nestjs/common';
import { BannerCaroselService } from './banner-carosel.service';
import { BannerCaroselController } from './banner-carosel.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { BannerCaroselSchema } from '../../../schema/banner-carosel.schema';
import { UserSchema } from '../../../schema/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'BannerCarosel', schema: BannerCaroselSchema },
      { name: 'User', schema: UserSchema },
    ]),
  ],
  providers: [BannerCaroselService],
  controllers: [BannerCaroselController],
})
export class BannerCaroselModule {}  
