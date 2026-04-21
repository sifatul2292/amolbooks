import { Module } from '@nestjs/common';
import { SpecialPackageController } from './special-package.controller';
import { SpecialPackageService } from './special-package.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductSchema } from '../../../schema/product.schema';
import { SpecialPackageSchema } from '../../../schema/special-package.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'SpecialPackage', schema: SpecialPackageSchema },
      { name: 'Product', schema: ProductSchema },
    ]),
  ],
  controllers: [SpecialPackageController],
  providers: [SpecialPackageService],
  exports: [SpecialPackageService]
})
export class SpecialPackageModule {}
