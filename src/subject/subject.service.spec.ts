import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Subject } from './entities/subject.entity.js';
import { SubjectService } from './subject.service.js';

function queryBuilderMock(result: any) {
  const qb: any = {};
  qb.andWhere = vi.fn().mockReturnValue(qb);
  qb.orderBy = vi.fn().mockReturnValue(qb);
  qb.take = vi.fn().mockReturnValue(qb);
  qb.skip = vi.fn().mockReturnValue(qb);
  qb.getMany = vi.fn().mockResolvedValue(result);
  return qb;
}

describe('SubjectService', () => {
  let service: SubjectService;
  let subjectRepo: any;

  const dto = { name: 'Cálculo I', university: 'ICESI', semester: '3' };
  const stored = { id: 'subject-1', ...dto };

  beforeEach(async () => {
    subjectRepo = {
      create: vi.fn((data) => ({ ...data })),
      save: vi.fn(async (subject) => {
        subject.id = subject.id ?? 'subject-1';
        return subject;
      }),
      findOneBy: vi.fn(),
      preload: vi.fn(),
      remove: vi.fn(),
      createQueryBuilder: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubjectService,
        { provide: getRepositoryToken(Subject), useValue: subjectRepo },
      ],
    })
    .setLogger({
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      verbose: vi.fn(),
    })
    .compile();

    service = module.get(SubjectService);
  });

  it('creates a subject', async () => {
    const subject = await service.create(dto);

    expect(subjectRepo.create).toHaveBeenCalledWith(dto);
    expect(subject.id).toBe('subject-1');
    expect(subject.name).toBe('Cálculo I');
  });

  it('maps a duplicated subject to ConflictException', async () => {
    subjectRepo.save.mockRejectedValue({ code: '23505', detail: 'duplicated' });

    await expect(service.create(dto)).rejects.toThrow(ConflictException);
  });

  it('maps unexpected errors to InternalServerErrorException', async () => {
    subjectRepo.save.mockRejectedValue(new Error('db down'));

    await expect(service.create(dto)).rejects.toThrow(InternalServerErrorException);
  });

  it('lists subjects applying the filters', async () => {
    const qb = queryBuilderMock([stored]);
    subjectRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await service.findAll({
      university: ' icesi ',
      semester: ' 3 ',
      search: ' cálculo ',
      limit: 5,
      skip: 1,
    });

    expect(result).toHaveLength(1);
    expect(qb.andWhere).toHaveBeenCalledWith('UPPER(subject.university) = :university', {
      university: 'ICESI',
    });
    expect(qb.andWhere).toHaveBeenCalledWith('UPPER(subject.semester) = :semester', {
      semester: '3',
    });
    expect(qb.andWhere).toHaveBeenCalledWith('UPPER(subject.name) LIKE :search', {
      search: '%CÁLCULO%',
    });
    expect(qb.take).toHaveBeenCalledWith(5);
    expect(qb.skip).toHaveBeenCalledWith(1);
  });

  it('lists subjects without filters', async () => {
    const qb = queryBuilderMock([]);
    subjectRepo.createQueryBuilder.mockReturnValue(qb);

    await service.findAll({});

    expect(qb.andWhere).not.toHaveBeenCalled();
  });

  it('finds one subject or throws when missing', async () => {
    subjectRepo.findOneBy.mockResolvedValueOnce(stored);
    await expect(service.findOne('subject-1')).resolves.toMatchObject({ id: 'subject-1' });

    subjectRepo.findOneBy.mockResolvedValueOnce(null);
    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  it('updates a subject', async () => {
    subjectRepo.preload.mockResolvedValue({ ...stored, name: 'Cálculo II' });

    const subject = await service.update('subject-1', { name: 'Cálculo II' });

    expect(subjectRepo.preload).toHaveBeenCalledWith({ id: 'subject-1', name: 'Cálculo II' });
    expect(subject?.name).toBe('Cálculo II');
  });

  it('throws NotFound when updating a missing subject', async () => {
    subjectRepo.preload.mockResolvedValue(null);

    await expect(service.update('missing', { name: 'Cálculo II' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('maps a duplicated update to ConflictException', async () => {
    subjectRepo.preload.mockResolvedValue(stored);
    subjectRepo.save.mockRejectedValue({ code: '23505', detail: 'duplicated' });

    await expect(service.update('subject-1', { name: 'Física I' })).rejects.toThrow(
      ConflictException,
    );
  });

  it('deletes a subject and keeps its id', async () => {
    subjectRepo.findOneBy.mockResolvedValue({ ...stored });

    const deleted = await service.remove('subject-1');

    expect(subjectRepo.remove).toHaveBeenCalled();
    expect(deleted.id).toBe('subject-1');
  });
});

describe('Subject normalize hook', () => {
  it('trims name, university and semester', () => {
    const subject = new Subject();
    subject.name = '  Cálculo I  ';
    subject.university = ' ICESI ';
    subject.semester = ' 3 ';
    subject.normalize();
    expect(subject.name).toBe('Cálculo I');
    expect(subject.university).toBe('ICESI');
    expect(subject.semester).toBe('3');
  });
});
