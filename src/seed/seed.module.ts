import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service.js';
import { SeedController } from './seed.controller.js';
import { User } from '../user/entities/user.entity.js';
import { Subject } from '../subject/entities/subject.entity.js';
import { TutorProfile } from '../tutor/entities/tutor-profile.entity.js';
import { Booking } from '../booking/entities/booking.entity.js';
import { UserModule } from '../user/user.module.js';

@Module({
  controllers: [SeedController],
  imports: [TypeOrmModule.forFeature([User, Subject, TutorProfile, Booking]), UserModule],
  providers: [SeedService],
})
export class SeedModule {}
