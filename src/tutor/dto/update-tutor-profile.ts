import { PartialType } from '@nestjs/swagger';
import { CreateTutorProfile } from './create-tutor-profile.js';

export class UpdateTutorProfile extends PartialType(CreateTutorProfile) {}
