import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubjectService } from './subject.service.js';
import { SubjectController } from './subject.controller.js';
import { Subject } from './entities/subject.entity.js';
import { UserModule } from '../user/user.module.js';

@Module({
  controllers: [SubjectController],
  imports: [TypeOrmModule.forFeature([Subject]), UserModule],
  providers: [SubjectService],
  exports: [TypeOrmModule, SubjectService],
})
export class SubjectModule {}
