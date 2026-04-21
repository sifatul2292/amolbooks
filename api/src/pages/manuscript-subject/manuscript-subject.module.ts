import { Module } from '@nestjs/common';
import { ManuscriptSubjectController } from './manuscript-subject.controller';
import { ManuscriptSubjectService } from './manuscript-subject.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ManuscriptSubjectSchema } from '../../schema/manuscript-subject.schema';
import { ProductSchema } from '../../schema/product.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'ManuscriptSubject', schema: ManuscriptSubjectSchema },
      { name: 'Product', schema: ProductSchema },
    ]),
  ],
  controllers: [ManuscriptSubjectController],
  providers: [ManuscriptSubjectService],
})
export class ManuscriptSubjectModule {}
