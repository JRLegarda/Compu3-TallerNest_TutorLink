import { Module } from '@nestjs/common';
import { TutorService } from './tutor.service.js';
import { TutorController } from './tutor.controller.js';

// Esqueleto. El perfil del tutor se implementa después.

@Module({
  controllers: [TutorController],
  providers: [TutorService],
})
export class TutorModule {}
