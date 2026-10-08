import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../user/entities/user.entity.js';
import { Subject } from '../../subject/entities/subject.entity.js';

@Entity('tutor_profile')
export class TutorProfile {
  @ApiProperty({ example: '4fcfc5ab-7902-478f-b173-b8f1e751af12', description: 'Tutor profile id (UUID)', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Estudiante de ingeniería con 3 semestres dando tutorías de cálculo.', description: 'Tutor bio' })
  @Column('text')
  bio: string;

  @ApiProperty({ example: 15000, description: 'Hourly rate in COP', minimum: 1 })
  @Column('int')
  hourlyRate: number;

  @ApiProperty({ example: 'Monitor de Cálculo I (2025), promedio 4.5.', description: 'Academic history shown to students' })
  @Column('text')
  academicHistory: string;

  @ApiProperty({ example: 'ICESI', description: 'Tutor university' })
  @Column('text')
  university: string;

  @ApiProperty({ example: false, description: 'Whether an admin verified the profile' })
  @Column('bool', { default: false })
  isVerified: boolean;

  @OneToOne(() => User, { onDelete: 'CASCADE', eager: true })
  @JoinColumn()
  user: User;

  @ApiProperty({ description: 'Subjects the tutor teaches', type: () => [Subject] })
  @ManyToMany(() => Subject, { eager: true })
  @JoinTable({ name: 'tutor_profile_subjects' })
  subjects: Subject[];
}
