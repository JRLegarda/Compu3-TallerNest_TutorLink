import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../user/entities/user.entity.js';
import { TutorProfile } from '../../tutor/entities/tutor-profile.entity.js';
import { Subject } from '../../subject/entities/subject.entity.js';
import { BookingStatus } from '../enums/booking-status.enum.js';

@Entity('booking')
export class Booking {
  @ApiProperty({ example: '4fcfc5ab-7902-478f-b173-b8f1e751af12', description: 'Booking id (UUID)', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  student: User;

  @ApiProperty({ description: 'Tutor profile of the booking', type: () => TutorProfile })
  @ManyToOne(() => TutorProfile, { onDelete: 'CASCADE', eager: true })
  tutorProfile: TutorProfile;

  @ApiProperty({ description: 'Subject of the booking', type: () => Subject })
  @ManyToOne(() => Subject, { eager: true })
  subject: Subject;

  @ApiProperty({ example: '2026-10-20T14:00:00.000Z', description: 'Session start (ISO date)', format: 'date-time' })
  @Column('timestamptz')
  startAt: Date;

  @ApiProperty({ example: '2026-10-20T15:00:00.000Z', description: 'Session end (ISO date)', format: 'date-time' })
  @Column('timestamptz')
  endAt: Date;

  @ApiProperty({ example: BookingStatus.PENDING, description: 'Booking status', enum: BookingStatus })
  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING })
  status: BookingStatus;
}
