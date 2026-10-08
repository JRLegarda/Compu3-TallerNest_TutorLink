import { PartialType } from '@nestjs/swagger';
import { CreateBooking } from './create-booking.js';

export class UpdateBooking extends PartialType(CreateBooking) {}
