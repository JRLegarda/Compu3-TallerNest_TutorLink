import {BeforeInsert,BeforeUpdate,Column,Entity,PrimaryGeneratedColumn,} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../enums/user-role.enum.js';

@Entity()
export class User {
  @ApiProperty({ example: '4fcfc5ab-7902-478f-b173-b8f1e751af12', description: 'User id (UUID)', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'ana@example.com', description: 'User email (unique)', format: 'email' })
  @Column({ type: 'text', unique: true })
  email: string;

  // select:false => nunca viaja en un find normal; hay que pedirla con `select`
  @Column({ type: 'text', select: false })
  password?: string;

  @ApiProperty({ example: 'Ana Pérez', description: "User's full name" })
  @Column({ type: 'text' })
  fullName: string;

  @ApiProperty({ example: true, description: 'Whether the user is active' })
  @Column('bool', { default: true })
  isActive: boolean;

  // Sube en cada logout. El JWT lleva este número; si no coincide, la sesión murió.
  @Column({ type: 'int', default: 0, select: false })
  tokenVersion?: number;

  // default: todo usuario nuevo es estudiante
  @ApiProperty({ example: [UserRole.STUDENT], description: 'User roles', enum: UserRole, isArray: true })
  @Column({ type: 'text', array: true, default: [UserRole.STUDENT] })
  roles: UserRole[];

  @BeforeInsert()
  @BeforeUpdate()
  checkEmailBeforeChanges() {
    if (this.email) this.email = this.email.toLowerCase().trim();
  }
}
