import { Controller } from '@nestjs/common';
import { BookingService } from './booking.service.js';

@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}
}
