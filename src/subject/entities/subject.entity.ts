import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity()
@Unique(['name', 'university', 'semester'])
export class Subject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  name: string;

  @Column('text')
  university: string;

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
