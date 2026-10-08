import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SubjectController } from './subject.controller.js';
import { SubjectService } from './subject.service.js';

describe('SubjectController', () => {
  let controller: SubjectController;
  let service: {
    create: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };

  const dto = { name: 'Cálculo I', university: 'ICESI', semester: '3' };

  beforeEach(() => {
    service = {
      create: vi.fn().mockResolvedValue({ id: 'subject-1', ...dto }),
      findAll: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue({ id: 'subject-1' }),
      update: vi.fn().mockResolvedValue({ id: 'subject-1', name: 'Cálculo II' }),
      remove: vi.fn().mockResolvedValue({ id: 'subject-1' }),
    };
    controller = new SubjectController(service as unknown as SubjectService);
  });

  it('delegates create, list and find', async () => {
    const filter = { university: 'ICESI', limit: 10, skip: 0 };

    await controller.create(dto);
    await controller.findAll(filter);
    await controller.findOne('subject-1');

    expect(service.create).toHaveBeenCalledWith(dto);
    expect(service.findAll).toHaveBeenCalledWith(filter);
    expect(service.findOne).toHaveBeenCalledWith('subject-1');
  });

  it('delegates update and delete', async () => {
    await controller.update('subject-1', { name: 'Cálculo II' });
    await controller.remove('subject-1');

    expect(service.update).toHaveBeenCalledWith('subject-1', { name: 'Cálculo II' });
    expect(service.remove).toHaveBeenCalledWith('subject-1');
  });
});
