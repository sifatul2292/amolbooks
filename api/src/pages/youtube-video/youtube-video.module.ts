import { Module } from '@nestjs/common';
import { YoutubeVideoService } from './youtube-video.service';
import { YoutubeVideoController } from './youtube-video.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { YoutubeVideoSchema } from '../../schema/youtube-video.schema';
import { UserSchema } from '../../schema/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'YoutubeVideo', schema: YoutubeVideoSchema },
      { name: 'User', schema: UserSchema },
    ]),
  ],
  providers: [YoutubeVideoService],
  controllers: [YoutubeVideoController],
})
export class YoutubeVideoModule {}  
