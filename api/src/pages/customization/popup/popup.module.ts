import { Module } from '@nestjs/common';
import { PopupController } from './popup.controller';
import { PopupService } from './popup.service';
import { MongooseModule } from '@nestjs/mongoose';
import { PopupSchema } from '../../../schema/popup.schema';
import { ProductSchema } from '../../../schema/product.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Popup', schema: PopupSchema },
      { name: 'Product', schema: ProductSchema },
    ]),
  ],
  controllers: [PopupController],
  providers: [PopupService],
})
export class PopupModule {}
