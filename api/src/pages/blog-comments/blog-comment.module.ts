import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BlogCommentSchema } from 'src/schema/blog-comment.schema';
import { ProductSchema } from '../../schema/product.schema';
import { BlogCommentController } from './blog-comment.controller';
import { BlogCommentService } from './blog-comment.service';
import { UserSchema } from '../../schema/user.schema';
import { BlogSchema } from '../../schema/blog.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'BlogComment', schema: BlogCommentSchema },
      { name: 'Blog', schema: BlogSchema },
      { name: 'User', schema: UserSchema },
    ]),
  ],
  controllers: [BlogCommentController],
  providers: [BlogCommentService],
})
export class BlogCommentModule {}
