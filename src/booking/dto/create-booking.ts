import { IsDateString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBooking {
  @ApiProperty({ example: '4fcfc5ab-7902-478f-b173-b8f1e751af12', description: 'Tutor profile id (UUID)', format: 'uuid' })
  @IsUUID()
  tutorProfileId: string;

  @ApiProperty({ example: '9b2f1c3e-2a4d-4e8b-9f1a-6c7d8e9f0a1b', description: 'Subject id (UUID). The tutor must teach it', format: 'uuid' })
  @IsUUID()
  subjectId: string;

  @ApiProperty({ example: '2026-10-20T14:00:00.000Z', description: 'Session start (ISO date)', format: 'date-time' })
  @IsDateString()
  startAt: string;

  @ApiProperty({ example: '2026-10-20T15:00:00.000Z', description: 'Session end (ISO date, after startAt)', format: 'date-time' })
  @IsDateString()
  endAt: string;
}
