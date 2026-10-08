import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TutorService } from './tutor.service.js';
import { TutorController } from './tutor.controller.js';
import { TutorProfile } from './entities/tutor-profile.entity.js';
import { Subject } from '../subject/entities/subject.entity.js';
import { UserModule } from '../user/user.module.js';

@Module({
  controllers: [TutorController],
  imports: [TypeOrmModule.forFeature([TutorProfile, Subject]), UserModule],
  providers: [TutorService],
  exports: [TypeOrmModule, TutorService],
})
export class TutorModule {}
