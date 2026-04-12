import { Module } from '@nestjs/common';
import { HotelController } from './hotel.controller';
import { HotelService } from './hotel.service';
import { HotelReviewsService } from './hotel.reviews';
import { AiService } from '../ai/ai.service';

@Module({
  controllers: [HotelController],
  providers: [
    HotelService,
    HotelReviewsService,
    AiService,
  ],
  exports: [HotelService],
})
export class HotelModule {}