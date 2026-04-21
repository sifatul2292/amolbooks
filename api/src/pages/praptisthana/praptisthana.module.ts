import { Module } from '@nestjs/common';
import { PraptisthanaService } from './praptisthana.service';
import { PraptisthanaController } from './praptisthana.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema } from '../../schema/user.schema';
import { PraptisthanaSchema } from '../../schema/praptisthana.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Praptisthana', schema: PraptisthanaSchema },
      { name: 'User', schema: UserSchema },
    ]),
  ],
  providers: [PraptisthanaService],
  controllers: [PraptisthanaController],
})
export class PraptisthanaModule {}
