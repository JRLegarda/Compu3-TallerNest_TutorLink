import {BeforeInsert,BeforeUpdate,Column,Entity,PrimaryGeneratedColumn,} from 'typeorm';
import { UserRole } from '../enums/user-role.enum.js';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', unique: true })
  email: string;

  // select:false => nunca viaja en un find normal; hay que pedirla con `select`
  @Column({ type: 'text', select: false })
  password?: string;

  @Column({ type: 'text' })
  fullName: string;

  @Column('bool', { default: true })
  isActive: boolean;

  // default: todo usuario nuevo es estudiante
  @Column({ type: 'text', array: true, default: [UserRole.STUDENT] })
  roles: UserRole[];

  @BeforeInsert()
  @BeforeUpdate()
  checkEmailBeforeChanges() {
    if (this.email) this.email = this.email.toLowerCase().trim();
  }
}
