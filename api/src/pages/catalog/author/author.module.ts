import { Module } from '@nestjs/common';
import { AuthorService } from './author.service';
import { AuthorController } from './author.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthorSchema } from '../../../schema/author.schema';
import { UserSchema } from '../../../schema/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Author', schema: AuthorSchema },
      { name: 'User', schema: UserSchema },
    ]),
  ],
  providers: [AuthorService],
  controllers: [AuthorController],
})
export class AuthorModule {}  
