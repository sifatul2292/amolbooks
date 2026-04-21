import { Module } from '@nestjs/common';
import { ManuscriptService } from './manuscript.service';
import { ManuscriptController } from './manuscript.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { ManuscriptSchema } from '../../schema/manuscript.schema';
import { UserSchema } from '../../schema/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Manuscript', schema: ManuscriptSchema },
      { name: 'User', schema: UserSchema },
    ]),
  ],
  providers: [ManuscriptService],
  controllers: [ManuscriptController],
})
export class ManuscriptModule { }
