import { Global, Module } from '@nestjs/common';
import { FbCatalogService } from './fb-catalog.service';
import { HttpModule } from '@nestjs/axios';

@Global()
@Module({
  imports: [HttpModule],
  providers: [FbCatalogService],
  exports: [FbCatalogService],
})
export class FbCatalogModule {}
