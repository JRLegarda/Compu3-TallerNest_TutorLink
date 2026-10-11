import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiConflictResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { BookingService } from './booking.service.js';
import { CreateBooking } from './dto/create-booking.js';
import { FilterBooking } from './dto/filter-booking.dto.js';
import { Booking } from './entities/booking.entity.js';
import { Auth } from '../user/decorators/auth.decorator.js';
import { GetUser } from '../user/decorators/get-user.decorator.js';
import { UserRole } from '../user/enums/user-role.enum.js';
import { User } from '../user/entities/user.entity.js';

@ApiTags('Bookings')
@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @Auth(UserRole.STUDENT)
  @ApiOperation({ summary: 'Create a booking', description: 'Requires the student role. The tutor must teach the subject and have no overlapping active booking' })
  @ApiOkResponse({ description: 'Booking was created (PENDING)', type: Booking })
  @ApiBadRequestResponse({ description: 'Invalid dates, inactive tutor or tutor does not teach the subject' })
  @ApiConflictResponse({ description: 'Overlapping booking for that tutor' })
  @ApiNotFoundResponse({ description: 'Tutor or subject not found' })
  create(@GetUser() student: User, @Body() dto: CreateBooking) {
    return this.bookingService.create(student, dto);
  }

  // Va antes de las rutas con :id para que "mine" no se lea como un id
  @Get('mine')
  @Auth()
  @ApiOperation({ summary: 'List my bookings', description: 'Returns bookings where I am the student or the tutor' })
  @ApiOkResponse({ description: 'My bookings', type: [Booking] })
  @ApiBadRequestResponse({ description: 'Invalid filter params' })
  findMine(@GetUser() user: User, @Query() filter: FilterBooking) {
    return this.bookingService.findMine(user, filter);
  }

  @Patch(':id/confirm')
  @Auth(UserRole.TUTOR)
  @ApiOperation({ summary: 'Confirm a booking', description: 'Only the owning tutor. Moves PENDING to CONFIRMED' })
  @ApiParam({ name: 'id', description: 'Booking id (UUID)', format: 'uuid' })
  @ApiOkResponse({ description: 'Booking was confirmed', type: Booking })
  @ApiBadRequestResponse({ description: 'Booking is not PENDING' })
  @ApiForbiddenResponse({ description: 'Only the tutor of this booking' })
  @ApiNotFoundResponse({ description: 'Booking not found' })
  confirm(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    return this.bookingService.confirm(id, user);
  }

  @Patch(':id/cancel')
  @Auth()
  @ApiOperation({ summary: 'Cancel a booking', description: 'Only the owner of the booking (student or tutor). Moves PENDING or CONFIRMED to CANCELLED' })
  @ApiParam({ name: 'id', description: 'Booking id (UUID)', format: 'uuid' })
  @ApiOkResponse({ description: 'Booking was cancelled', type: Booking })
  @ApiBadRequestResponse({ description: 'Booking cannot be cancelled in its current status' })
  @ApiForbiddenResponse({ description: 'Only the owner of this booking' })
  @ApiNotFoundResponse({ description: 'Booking not found' })
  cancel(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    return this.bookingService.cancel(id, user);
  }

  @Patch(':id/complete')
  @Auth(UserRole.TUTOR)
  @ApiOperation({ summary: 'Complete a booking', description: 'Only the owning tutor. Moves CONFIRMED to COMPLETED' })
  @ApiParam({ name: 'id', description: 'Booking id (UUID)', format: 'uuid' })
  @ApiOkResponse({ description: 'Booking was completed', type: Booking })
  @ApiBadRequestResponse({ description: 'Booking is not CONFIRMED' })
  @ApiForbiddenResponse({ description: 'Only the tutor of this booking' })
  @ApiNotFoundResponse({ description: 'Booking not found' })
  complete(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    return this.bookingService.complete(id, user);
  }
}
