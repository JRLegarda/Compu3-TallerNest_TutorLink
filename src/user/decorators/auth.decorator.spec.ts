import { describe, expect, it } from 'vitest';
import { UserRole } from '../enums/user-role.enum.js';
import { Auth } from './auth.decorator.js';

describe('Auth decorator', () => {
  it('builds a decorator for any session and for a specific role', () => {
    expect(Auth()).toBeTypeOf('function');
    expect(Auth(UserRole.ADMIN)).toBeTypeOf('function');
  });
});
