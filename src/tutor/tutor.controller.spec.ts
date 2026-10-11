import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TutorController } from './tutor.controller.js';
import { TutorService } from './tutor.service.js';
import { User } from '../user/entities/user.entity.js';

describe('TutorController', () => {
  let controller: TutorController;
  let service: {
    upsertMyProfile: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    verify: ReturnType<typeof vi.fn>;
  };

  const user = { id: 'user-tutor-1' } as User;
  const dto = {
    bio: 'Estudiante de ingeniería con 3 semestres dando tutorías.',
    hourlyRate: 15000,
    academicHistory: 'Monitor de Cálculo I (2025), promedio 4.5.',
    university: 'ICESI',
    subjectIds: ['subject-1'],
  };

  beforeEach(() => {
    // arrange
    service = {
      upsertMyProfile: vi.fn().mockResolvedValue({ id: 'tutor-1' }),
      findAll: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue({ id: 'tutor-1' }),
      verify: vi.fn().mockResolvedValue({ id: 'tutor-1', isVerified: true }),
    };
    controller = new TutorController(service as unknown as TutorService);
  });

  it('delegates upsertMyProfile with the user and dto', async () => {
    // act
    await controller.upsertMe(user, dto);

    // assert
    expect(service.upsertMyProfile).toHaveBeenCalledWith(user, dto);
  });

  it('delegates findAll with the filter', async () => {
    // arrange
    const filter = { university: 'ICESI', limit: 10, skip: 0 };

    // act
    await controller.findAll(filter);

    // assert
    expect(service.findAll).toHaveBeenCalledWith(filter);
  });

  it('delegates findOne and verify with the id', async () => {
    // act
    await controller.findOne('tutor-1');
    await controller.verify('tutor-1');

    // assert
    expect(service.findOne).toHaveBeenCalledWith('tutor-1');
    expect(service.verify).toHaveBeenCalledWith('tutor-1');
  });
});
