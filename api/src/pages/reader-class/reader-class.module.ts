import { Module } from '@nestjs/common';
import { ReaderClassController } from './reader-class.controller';
import { ReaderClassService } from './reader-class.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ReaderClassSchema } from '../../schema/reader-class.schema';
import { ProductSchema } from '../../schema/product.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'ReaderClass', schema: ReaderClassSchema },
      { name: 'Product', schema: ProductSchema },
    ]),
  ],
  controllers: [ReaderClassController],
  providers: [ReaderClassService],
})
export class ReaderClassModule {}
