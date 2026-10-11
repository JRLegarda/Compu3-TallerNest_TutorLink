import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ReviewService } from './review.service.js';
import { ApiBadRequestResponse, ApiConflictResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Auth } from '../user/decorators/auth.decorator.js';
import { UserRole } from '../user/enums/user-role.enum.js';
import { Review } from './entities/review.entity.js';
import { GetUser } from '../user/decorators/get-user.decorator.js';
import { CreateReview } from './dto/create-review.js';
import { User } from '../user/entities/user.entity.js';

@ApiTags('Reviews')
@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @Auth(UserRole.STUDENT)
  @ApiOperation({ summary: 'Review a completed booking', description: 'Only the owning student. One review per booking' })
  @ApiOkResponse({ description: 'Review created', type: Review })
  @ApiBadRequestResponse({ description: 'Booking is not COMPLETED' })
  @ApiForbiddenResponse({ description: 'You can only review your own bookings' })
  @ApiConflictResponse({ description: 'This booking already has a review' })
  @ApiNotFoundResponse({ description: 'Booking not found' })
  create(@GetUser() student : User , @Body() dto : CreateReview){
    return this.reviewService.create(student, dto);
  }

  @Get('tutor/:tutorId')
  @Auth()
  @ApiOperation({ summary: 'List a tutor reviews and their average', description: 'Public for any authenticated user' })
  @ApiParam({ name: 'tutorId', description: 'Tutor profile id (UUID)', format: 'uuid' })
  @ApiOkResponse({ description: 'Reviews, count and average rating' })
  findByTutor(@Param('tutorId', ParseUUIDPipe) tutorId: string) {
    return this.reviewService.findByTutor(tutorId);
  }


}
