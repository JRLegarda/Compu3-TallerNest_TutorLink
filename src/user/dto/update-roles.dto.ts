import { ArrayNotEmpty, ArrayUnique, IsArray, IsEnum } from 'class-validator';
import { UserRole } from '../enums/user-role.enum.js';

export class UpdateRoles {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(UserRole, { each: true })
  roles: UserRole[];
}
