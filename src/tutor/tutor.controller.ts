import { Controller } from '@nestjs/common';
import { TutorService } from './tutor.service.js';

@Controller('tutor')
export class TutorController {
  constructor(private readonly tutorService: TutorService) {}
}
