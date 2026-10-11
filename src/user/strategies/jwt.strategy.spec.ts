import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '../enums/user-role.enum.js';
import { JwtStrategy } from './jwt.strategy.js';

describe('JwtStrategy', () => {
  const userRepository = { findOne: vi.fn() };
  const user = {
    id: 'user-1',
    email: 'ana@example.com',
    fullName: 'Ana Pérez',
    isActive: true,
    roles: [UserRole.STUDENT],
    tokenVersion: 2,
  };

  let strategy: JwtStrategy;

  beforeEach(() => {
    vi.clearAllMocks();
    strategy = new JwtStrategy(
      userRepository as never,
      new ConfigService({ JWT_SECRET: 'test-secret' }),
    );
  });

  it('returns the user when the token session is still valid', async () => {
    userRepository.findOne.mockResolvedValue({ ...user });

    const result = await strategy.validate({
      id: user.id,
      email: user.email,
      tokenVersion: 2,
    });

    expect(result.email).toBe(user.email);
    expect(result).not.toHaveProperty('tokenVersion');
  });

  it('rejects a token issued before logout', async () => {
    userRepository.findOne.mockResolvedValue({ ...user });

    await expect(
      strategy.validate({ id: user.id, email: user.email, tokenVersion: 1 }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an unknown or inactive user', async () => {
    userRepository.findOne.mockResolvedValueOnce(null);
    await expect(
      strategy.validate({ id: user.id, email: user.email, tokenVersion: 2 }),
    ).rejects.toThrow(UnauthorizedException);

    userRepository.findOne.mockResolvedValueOnce({ ...user, isActive: false });
    await expect(
      strategy.validate({ id: user.id, email: user.email, tokenVersion: 2 }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('fails to start when JWT_SECRET is missing', () => {
    expect(
      () => new JwtStrategy(userRepository as never, new ConfigService({})),
    ).toThrow('JWT_SECRET is not set');
  });
});
