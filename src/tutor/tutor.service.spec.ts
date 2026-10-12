import { ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Subject } from '../subject/entities/subject.entity.js';
import { User } from '../user/entities/user.entity.js';
import { UserRole } from '../user/enums/user-role.enum.js';
import { CreateTutorProfile } from './dto/create-tutor-profile.js';
import { TutorProfile } from './entities/tutor-profile.entity.js';
import { TutorService } from './tutor.service.js';

function queryBuilderMock(result: any) {
  const qb: any = {};
  qb.leftJoinAndSelect = vi.fn().mockReturnValue(qb);
  qb.andWhere = vi.fn().mockReturnValue(qb);
  qb.orderBy = vi.fn().mockReturnValue(qb);
  qb.take = vi.fn().mockReturnValue(qb);
  qb.skip = vi.fn().mockReturnValue(qb);
  qb.getMany = vi.fn().mockResolvedValue(result);
  return qb;
}

describe('TutorService', () => {
  let service: TutorService;
  let tutorRepo: any;
  let subjectRepo: any;

  const tutorUser = {
    id: 'user-tutor-1',
    email: 'tutor1@example.com',
    fullName: 'Carlos Tutor',
    isActive: true,
    roles: [UserRole.TUTOR],
  } as User;

  const subjects = [{ id: 'subject-1' }, { id: 'subject-2' }] as Subject[];

  const dto: CreateTutorProfile = {
    bio: 'Estudiante de ingeniería con 3 semestres dando tutorías.',
    hourlyRate: 15000,
    academicHistory: 'Monitor de Cálculo I (2025), promedio 4.5.',
    university: 'ICESI',
    subjectIds: ['subject-1', 'subject-2'],
  };

  beforeEach(async () => {
    tutorRepo = {
      create: vi.fn(),
      save: vi.fn(),
      findOne: vi.fn(),
      createQueryBuilder: vi.fn(),
    };
    subjectRepo = { find: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TutorService,
        { provide: getRepositoryToken(TutorProfile), useValue: tutorRepo },
        { provide: getRepositoryToken(Subject), useValue: subjectRepo },
      ],
    }).compile();

    service = module.get<TutorService>(TutorService);
  });

  it('creates the profile when the user has none', async () => {
    tutorRepo.findOne.mockResolvedValue(null);
    subjectRepo.find.mockResolvedValue(subjects);
    tutorRepo.create.mockReturnValue({ ...dto, subjects, user: tutorUser });
    tutorRepo.save.mockImplementation(async (p: any) => ({ id: 'tutor-1', ...p }));

    const profile = await service.upsertMyProfile(tutorUser, dto);

    expect(subjectRepo.find).toHaveBeenCalled();
    expect(tutorRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ bio: dto.bio, hourlyRate: dto.hourlyRate, user: tutorUser }),
    );
    expect(profile.id).toBe('tutor-1');
    expect(profile.subjects).toHaveLength(2);
  });

  it('replaces the profile when the user already has one', async () => {
    const existing = { id: 'tutor-1', user: tutorUser, subjects: [] } as any;
    tutorRepo.findOne.mockResolvedValue(existing);
    subjectRepo.find.mockResolvedValue(subjects);
    tutorRepo.save.mockImplementation(async (p: any) => p);

    const profile = await service.upsertMyProfile(tutorUser, dto);

    expect(tutorRepo.create).not.toHaveBeenCalled();
    expect(profile.bio).toBe(dto.bio);
    expect(profile.subjects).toHaveLength(2);
  });

  it('throws NotFound when a subject does not exist', async () => {
    tutorRepo.findOne.mockResolvedValue(null);
    subjectRepo.find.mockResolvedValue([subjects[0]]);

    await expect(service.upsertMyProfile(tutorUser, dto)).rejects.toThrow(NotFoundException);
    expect(tutorRepo.save).not.toHaveBeenCalled();
  });

  it('lists tutors applying the filters', async () => {
    const qb = queryBuilderMock([{ id: 'tutor-1' }]);
    tutorRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await service.findAll({
      subjectId: 'subject-1',
      university: 'icesi',
      maxRate: 20000,
      verified: true,
    } as any);

    expect(result).toHaveLength(1);
    expect(qb.andWhere).toHaveBeenCalledWith('subject.id = :subjectId', {
      subjectId: 'subject-1',
    });
    expect(qb.andWhere).toHaveBeenCalledWith('UPPER(tutor.university) = :university', {
      university: 'ICESI',
    });
    expect(qb.andWhere).toHaveBeenCalledWith('tutor.hourlyRate <= :maxRate', { maxRate: 20000 });
    expect(qb.andWhere).toHaveBeenCalledWith('tutor.isVerified = :verified', { verified: true });
  });

  it('finds one tutor by id', async () => {
    tutorRepo.findOne.mockResolvedValue({ id: 'tutor-1' });

    const tutor = await service.findOne('tutor-1');

    expect(tutor.id).toBe('tutor-1');
    tutorRepo.findOne.mockResolvedValueOnce(null);
    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  it('verifies a tutor', async () => {
    tutorRepo.findOne.mockResolvedValue({ id: 'tutor-1', isVerified: false });
    tutorRepo.save.mockImplementation(async (p: any) => p);

    const tutor = await service.verify('tutor-1');

    expect(tutor.isVerified).toBe(true);
    tutorRepo.findOne.mockResolvedValueOnce(null);
    await expect(service.verify('missing')).rejects.toThrow(NotFoundException);
  });

  it('maps duplicated keys to ConflictException', async () => {
    tutorRepo.findOne.mockResolvedValue(null);
    subjectRepo.find.mockResolvedValue(subjects);
    tutorRepo.create.mockReturnValue({});
    tutorRepo.save.mockRejectedValue({ code: '23505', detail: 'duplicated' });

    await expect(service.upsertMyProfile(tutorUser, dto)).rejects.toThrow(ConflictException);
  });

  it('maps an unexpected error while saving the profile', async () => {
    tutorRepo.findOne.mockResolvedValue(null);
    subjectRepo.find.mockResolvedValue(subjects);
    tutorRepo.create.mockReturnValue({});
    tutorRepo.save.mockRejectedValue(new Error('db down'));

    await expect(service.upsertMyProfile(tutorUser, dto)).rejects.toThrow(
      InternalServerErrorException,
    );
  });

  it('lists tutors without applying optional filters', async () => {
    const qb = queryBuilderMock([]);
    tutorRepo.createQueryBuilder.mockReturnValue(qb);

    await service.findAll({} as any);

    expect(qb.andWhere).not.toHaveBeenCalled();
    expect(qb.orderBy).toHaveBeenCalledWith('tutor.hourlyRate', 'ASC');
  });
});
