import { Module } from '@nestjs/common';
import { ReviewService } from './review.service.js';
import { ReviewController } from './review.controller.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './entities/review.entity.js';
import { Booking } from '../booking/entities/booking.entity.js';

@Module({
  controllers: [ReviewController],
  imports: [TypeOrmModule.forFeature([Review, Booking])],
  providers: [ReviewService],
  exports: [TypeOrmModule, ReviewService],
})
export class ReviewModule {}
