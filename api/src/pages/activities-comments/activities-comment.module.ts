import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ActivitiesCommentSchema } from 'src/schema/activities-comment.schema';
import { ProductSchema } from '../../schema/product.schema';
import { ActivitiesCommentController } from './activities-comment.controller';
import { ActivitiesCommentService } from './activities-comment.service';
import { UserSchema } from '../../schema/user.schema';
import { ActivitiesSchema } from '../../schema/activities.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'ActivitiesComment', schema: ActivitiesCommentSchema },
      { name: 'Activities', schema: ActivitiesSchema },
      { name: 'User', schema: UserSchema },
    ]),
  ],
  controllers: [ActivitiesCommentController],
  providers: [ActivitiesCommentService],
})
export class ActivitiesCommentModule {}
