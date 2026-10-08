import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '../enums/user-role.enum.js';
import { UserRoleGuard } from '../guards/user-role.guard.js';
import { RoleProtected } from './role-protected.decorator.js';

// Orden importante: AuthGuard primero (llena request.user), después UserRoleGuard
export function Auth(...roles: UserRole[]) {
  return applyDecorators(
    RoleProtected(...roles),
    UseGuards(AuthGuard(), UserRoleGuard),
    ApiBearerAuth('JWT-auth'),
    ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' }),
    ApiForbiddenResponse({
      description: roles.length
        ? `User needs one of these roles: ${roles.join(', ')}`
        : 'User is not allowed to access this resource',
    }),
  );
}
