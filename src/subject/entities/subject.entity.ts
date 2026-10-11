import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
@Unique(['name', 'university', 'semester'])
export class Subject {
  @ApiProperty({ example: '4fcfc5ab-7902-478f-b173-b8f1e751af12', description: 'Subject id (UUID)', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Cálculo I', description: 'Subject name' })
  @Column('text')
  name: string;

  @ApiProperty({ example: 'ICESI', description: 'University offering the subject' })
  @Column('text')
  university: string;

  @ApiProperty({ example: '3', description: 'Semester of the subject' })
  @Column('text')
  semester: string;

  @BeforeInsert()
  @BeforeUpdate()
  normalize() {
    if (this.name) this.name = this.name.trim();
    if (this.university) this.university = this.university.trim();
    if (this.semester) this.semester = this.semester.trim();
  }
}
