import { PartialType } from '@nestjs/swagger';
import { CreateSubject } from './create-subject.dto.js';

export class UpdateSubject extends PartialType(CreateSubject) {}
