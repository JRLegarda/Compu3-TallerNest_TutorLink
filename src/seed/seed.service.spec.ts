import { InternalServerErrorException } from '@nestjs/common';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SeedService } from './seed.service.js';
import { User } from '../user/entities/user.entity.js';
import { Subject } from '../subject/entities/subject.entity.js';
import { TutorProfile } from '../tutor/entities/tutor-profile.entity.js';
import { UserService } from '../user/user.service.js';

describe('SeedService', () => {
  let service: SeedService;
  let dataSource: { query: ReturnType<typeof vi.fn> };
  let userRepo: any;
  let subjectRepo: any;
  let tutorRepo: any;

  const originalEnv = { ...process.env };

  beforeEach(async () => {
    // arrange
    dataSource = { query: vi.fn().mockResolvedValue(undefined) };
    userRepo = { create: vi.fn((x) => x), save: vi.fn((x) => Promise.resolve(x)) };
    subjectRepo = { create: vi.fn((x) => x), save: vi.fn((x) => Promise.resolve(x)) };
    tutorRepo = { create: vi.fn((x) => x), save: vi.fn((x) => Promise.resolve(x)) };
    const userService = { encryptPassword: vi.fn(() => 'hashed') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedService,
        { provide: getDataSourceToken(), useValue: dataSource },
        { provide: UserService, useValue: userService },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Subject), useValue: subjectRepo },
        { provide: getRepositoryToken(TutorProfile), useValue: tutorRepo },
      ],
    }).compile();

    service = module.get(SeedService);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('throws when the admin env vars are missing', async () => {
    // arrange
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PASSWORD;
    delete process.env.ADMIN_FULL_NAME;

    // act
    const action = service.runSeed();

    // assert
    await expect(action).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('deletes tables in the right order', async () => {
    // arrange
    process.env.ADMIN_EMAIL = 'admin@tutorlink.com';
    process.env.ADMIN_PASSWORD = 'adminpass';
    process.env.ADMIN_FULL_NAME = 'Administrador';

    // act
    await service.runSeed();

    // assert
    const queries = dataSource.query.mock.calls.map((c) => c[0]);
    expect(queries[0]).toContain('DELETE FROM "review"');
    expect(queries[1]).toContain('DELETE FROM "booking"');
    expect(queries.at(-1)).toContain('DELETE FROM "user"');
  });

  it('runs the seed and returns the summary', async () => {
    // arrange
    process.env.ADMIN_EMAIL = 'admin@tutorlink.com';
    process.env.ADMIN_PASSWORD = 'adminpass';
    process.env.ADMIN_FULL_NAME = 'Administrador';

    // act
    const result = await service.runSeed();

    // assert
    expect(result.message).toBe('SEED EXECUTED');
    expect(result.admin).toBe('admin@tutorlink.com');
    expect(result.subjects).toBe(4);
    expect(result.students).toBe(2);
    expect(result.tutors).toBe(2);
    expect(userRepo.save).toHaveBeenCalled();
    expect(tutorRepo.save).toHaveBeenCalled();
  });
});
