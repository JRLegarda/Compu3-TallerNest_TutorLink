import { Module } from '@nestjs/common';
import { ReviewService } from './review.service.js';
import { ReviewController } from './review.controller.js';

// Esqueleto. Las reseñas se implementan después.

@Module({
  controllers: [ReviewController],
  providers: [ReviewService],
})
export class ReviewModule {}
