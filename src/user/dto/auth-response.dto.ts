import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../enums/user-role.enum.js';

export class AuthResponse {
  @ApiProperty({ example: '4fcfc5ab-7902-478f-b173-b8f1e751af12', description: 'User id (UUID)', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'ana@example.com', description: 'User email', format: 'email' })
  email: string;

  @ApiProperty({ example: 'Ana Pérez', description: "User's full name" })
  fullName: string;

  @ApiProperty({ example: true, description: 'Whether the user is active' })
  isActive: boolean;

  @ApiProperty({ example: [UserRole.STUDENT], description: 'User roles', enum: UserRole, isArray: true })
  roles: UserRole[];

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', description: 'JWT token (expires in 1h)' })
  token: string;
}
