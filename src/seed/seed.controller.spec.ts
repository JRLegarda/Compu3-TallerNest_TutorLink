import { UnauthorizedException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SeedController } from './seed.controller.js';
import { SeedService } from './seed.service.js';

describe('SeedController', () => {
  let controller: SeedController;
  let service: { runSeed: ReturnType<typeof vi.fn> };
  const originalKey = process.env.SEED_KEY;

  beforeEach(() => {
    // arrange
    service = { runSeed: vi.fn().mockResolvedValue({ message: 'SEED EXECUTED' }) };
    controller = new SeedController(service as unknown as SeedService);
  });

  afterEach(() => {
    process.env.SEED_KEY = originalKey;
  });

  it('rejects a wrong key', () => {
    // arrange
    process.env.SEED_KEY = 'secret';

    // act
    const action = () => controller.run('wrong');

    // assert
    expect(action).toThrow(UnauthorizedException);
    expect(service.runSeed).not.toHaveBeenCalled();
  });

  it('rejects when SEED_KEY is not configured', () => {
    // arrange
    delete process.env.SEED_KEY;

    // act
    const action = () => controller.run('anything');

    // assert
    expect(action).toThrow(UnauthorizedException);
  });

  it('runs the seed with the right key', async () => {
    // arrange
    process.env.SEED_KEY = 'secret';

    // act
    const result = await controller.run('secret');

    // assert
    expect(service.runSeed).toHaveBeenCalled();
    expect(result).toEqual({ message: 'SEED EXECUTED' });
  });
});
