import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BookingController } from './booking.controller.js';
import { BookingService } from './booking.service.js';
import { User } from '../user/entities/user.entity.js';

describe('BookingController', () => {
  let controller: BookingController;
  let service: {
    create: ReturnType<typeof vi.fn>;
    findMine: ReturnType<typeof vi.fn>;
    confirm: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
    complete: ReturnType<typeof vi.fn>;
  };

  const user = { id: 'student-1' } as User;
  const dto = {
    tutorProfileId: 'tutor-1',
    subjectId: 'subject-1',
    startAt: '2026-10-20T14:00:00.000Z',
    endAt: '2026-10-20T15:00:00.000Z',
  };

  beforeEach(() => {
    // arrange
    service = {
      create: vi.fn().mockResolvedValue({ id: 'booking-1', status: 'PENDING' }),
      findMine: vi.fn().mockResolvedValue([]),
      confirm: vi.fn().mockResolvedValue({ id: 'booking-1', status: 'CONFIRMED' }),
      cancel: vi.fn().mockResolvedValue({ id: 'booking-1', status: 'CANCELLED' }),
      complete: vi.fn().mockResolvedValue({ id: 'booking-1', status: 'COMPLETED' }),
    };
    controller = new BookingController(service as unknown as BookingService);
  });

  it('delegates create with the user and dto', async () => {
    // act
    await controller.create(user, dto);

    // assert
    expect(service.create).toHaveBeenCalledWith(user, dto);
  });

  it('delegates findMine with the user and filter', async () => {
    // arrange
    const filter = { status: 'PENDING' as any, limit: 10, skip: 0 };

    // act
    await controller.findMine(user, filter);

    // assert
    expect(service.findMine).toHaveBeenCalledWith(user, filter);
  });

  it('delegates confirm, cancel and complete with the id and user', async () => {
    // act
    await controller.confirm('booking-1', user);
    await controller.cancel('booking-1', user);
    await controller.complete('booking-1', user);

    // assert
    expect(service.confirm).toHaveBeenCalledWith('booking-1', user);
    expect(service.cancel).toHaveBeenCalledWith('booking-1', user);
    expect(service.complete).toHaveBeenCalledWith('booking-1', user);
  });
});
