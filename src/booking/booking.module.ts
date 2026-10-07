import { Module } from '@nestjs/common';
import { BookingService } from './booking.service.js';
import { BookingController } from './booking.controller.js';

// Esqueleto. Las reservas se implementan después.

@Module({
  controllers: [BookingController],
  providers: [BookingService],
})
export class BookingModule {}
