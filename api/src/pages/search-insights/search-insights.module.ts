import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SearchLogSchema } from './search-insights.schema';
import { SearchInsightsController } from './search-insights.controller';
import { SearchInsightsService } from './search-insights.service';

// What customers type in the shop's search box, for the admin "Customer Searches" page.
@Module({
  imports: [MongooseModule.forFeature([{ name: 'SearchLog', schema: SearchLogSchema }])],
  controllers: [SearchInsightsController],
  providers: [SearchInsightsService],
  exports: [SearchInsightsService],
})
export class SearchInsightsModule {}
