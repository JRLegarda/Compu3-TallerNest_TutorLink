import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReviewController } from './review.controller.js';
import { ReviewService } from './review.service.js';
import { User } from '../user/entities/user.entity.js';

describe('ReviewController', () => {
  let controller: ReviewController;
  let service: {
    create: ReturnType<typeof vi.fn>;
    findByTutor: ReturnType<typeof vi.fn>;
  };

  const student = { id: 'student-1' } as User;
  const dto = { bookingId: 'booking-1', rating: 5, comment: 'Muy buena' };

  beforeEach(() => {
    // arrange
    service = {
      create: vi.fn().mockResolvedValue({ id: 'review-1', ...dto }),
      findByTutor: vi.fn().mockResolvedValue({ average: 5, count: 1, reviews: [] }),
    };
    controller = new ReviewController(service as unknown as ReviewService);
  });

  it('delegates create with the user and dto', async () => {
    // act
    const result = await controller.create(student, dto);

    // assert
    expect(service.create).toHaveBeenCalledWith(student, dto);
    expect(result).toMatchObject({ rating: 5 });
  });

  it('delegates findByTutor with the tutor id', async () => {
    // act
    const result = await controller.findByTutor('tutor-1');

    // assert
    expect(service.findByTutor).toHaveBeenCalledWith('tutor-1');
    expect(result).toMatchObject({ average: 5, count: 1 });
  });
});
