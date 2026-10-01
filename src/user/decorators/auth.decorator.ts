import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '../enums/user-role.enum.js';
import { UserRoleGuard } from '../guards/user-role.guard.js';
import { RoleProtected } from './role-protected.decorator.js';

// Orden importante: AuthGuard primero (llena request.user), después UserRoleGuard
export function Auth(...roles: UserRole[]) {
  return applyDecorators(
    RoleProtected(...roles),
    UseGuards(AuthGuard(), UserRoleGuard),
  );
}
