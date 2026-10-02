import {BadRequestException,CanActivate,ExecutionContext,ForbiddenException,Injectable,} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { META_ROLES } from '../decorators/role-protected.decorator.js';
import { User } from '../entities/user.entity.js';
import { UserRole } from '../enums/user-role.enum.js';

@Injectable()
export class UserRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const validRoles = this.reflector.getAllAndOverride<UserRole[] | undefined>(
      META_ROLES,
      [context.getHandler(), context.getClass()],
    );

    // Sin roles definidos => basta con estar autenticado
    if (!validRoles || validRoles.length === 0) return true;

    const user: User | undefined = context.switchToHttp().getRequest().user;
    if (!user) throw new BadRequestException('User not found in request');

    if (user.roles.some((role) => validRoles.includes(role))) return true;

    throw new ForbiddenException(
      `User ${user.fullName} needs one of these roles: [${validRoles.join(', ')}]`,
    );
  }
}
