import { Module } from '@nestjs/common';
import { PublisherService } from './publisher.service';
import { PublisherController } from './publisher.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { PublisherSchema } from '../../../schema/publisher.schema';
import { UserSchema } from '../../../schema/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Publisher', schema: PublisherSchema },
      { name: 'User', schema: UserSchema },
    ]),
  ],
  providers: [PublisherService],
  controllers: [PublisherController],
})
export class PublisherModule {}  
