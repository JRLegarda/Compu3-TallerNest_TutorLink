import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingService } from './booking.service.js';
import { BookingController } from './booking.controller.js';
import { Booking } from './entities/booking.entity.js';
import { TutorProfile } from '../tutor/entities/tutor-profile.entity.js';
import { Subject } from '../subject/entities/subject.entity.js';
import { UserModule } from '../user/user.module.js';

@Module({
  controllers: [BookingController],
  imports: [TypeOrmModule.forFeature([Booking, TutorProfile, Subject]), UserModule],
  providers: [BookingService],
  exports: [TypeOrmModule, BookingService],
})
export class BookingModule {}
