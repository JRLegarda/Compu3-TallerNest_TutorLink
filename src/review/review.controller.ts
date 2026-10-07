import { Controller } from '@nestjs/common';
import { ReviewService } from './review.service.js';

@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}
}
