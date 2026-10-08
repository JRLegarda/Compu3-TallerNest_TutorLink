import { ArrayNotEmpty, ArrayUnique, IsArray, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../enums/user-role.enum.js';

export class UpdateRoles {
  @ApiProperty({ example: [UserRole.TUTOR], description: 'New roles for the user', enum: UserRole, isArray: true })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(UserRole, { each: true })
  roles: UserRole[];
}
