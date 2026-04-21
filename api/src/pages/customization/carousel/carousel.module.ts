import { Module } from '@nestjs/common';
import { CarouselService } from './carousel.service';
import { CarouselController } from './carousel.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { CarouselSchema } from '../../../schema/carousel.schema';
import { UserSchema } from '../../../schema/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Carousel', schema: CarouselSchema },
      { name: 'User', schema: UserSchema },
    ]),
  ],
  providers: [CarouselService],
  controllers: [CarouselController],
})
export class CarouselModule {}  
