import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '../enums/user-role.enum.js';
import { UserRoleGuard } from './user-role.guard.js';

function contextWith(user?: { fullName: string; roles: UserRole[] }) {
  return {
    getHandler: () => 'handler',
    getClass: () => 'class',
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('UserRoleGuard', () => {
  const reflector = { getAllAndOverride: vi.fn() };
  const guard = new UserRoleGuard(reflector as unknown as Reflector);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows any authenticated user when the route has no roles', () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    expect(guard.canActivate(contextWith())).toBe(true);
  });

  it('allows a user who has one of the required roles', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    expect(
      guard.canActivate(contextWith({ fullName: 'Ada Admin', roles: [UserRole.ADMIN] })),
    ).toBe(true);
  });

  it('rejects a student on an admin route', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    expect(() =>
      guard.canActivate(contextWith({ fullName: 'Ana Pérez', roles: [UserRole.STUDENT] })),
    ).toThrow(ForbiddenException);
  });

  it('rejects a protected route when the request has no user', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.TUTOR]);
    expect(() => guard.canActivate(contextWith())).toThrow(BadRequestException);
  });
});
