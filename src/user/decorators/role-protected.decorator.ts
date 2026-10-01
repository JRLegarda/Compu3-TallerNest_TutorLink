import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../enums/user-role.enum.js';

export const META_ROLES = 'roles';

// Solo "etiqueta" la ruta con los roles permitidos; quien los lee es el guard
export const RoleProtected = (...roles: UserRole[]) =>
  SetMetadata(META_ROLES, roles);
