import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ReviewService } from './review.service.js';
import { Review } from './entities/review.entity.js';
import { Booking } from '../booking/entities/booking.entity.js';
import { BookingStatus } from '../booking/enums/booking-status.enum.js';
import { User } from '../user/entities/user.entity.js';

describe('ReviewService', () => {
  let service: ReviewService;
  let reviewRepo: any;
  let bookingRepo: any;

  const student = { id: 'student-1' } as User;

  const completedBooking = {
    id: 'booking-1',
    status: BookingStatus.COMPLETED,
    student: { id: 'student-1' },
    tutorProfile: { id: 'tutor-1' },
  } as unknown as Booking;

  function queryBuilderMock(rawResult: any) {
    const qb: any = {};
    qb.innerJoin = vi.fn().mockReturnValue(qb);
    qb.where = vi.fn().mockReturnValue(qb);
    qb.select = vi.fn().mockReturnValue(qb);
    qb.getRawOne = vi.fn().mockResolvedValue(rawResult);
    return qb;
  }

  beforeEach(async () => {
    reviewRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
      create: vi.fn((x) => x),
      save: vi.fn((x) => Promise.resolve({ id: 'review-1', ...x })),
      createQueryBuilder: vi.fn(() => queryBuilderMock({ avg: '4.5' })),
    };
    bookingRepo = { findOne: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        { provide: getRepositoryToken(Review), useValue: reviewRepo },
        { provide: getRepositoryToken(Booking), useValue: bookingRepo },
      ],
    }).compile();

    service = module.get(ReviewService);
  });

  const dto = { bookingId: 'booking-1', rating: 5, comment: 'Muy buena' };

  it('rejects a booking that does not exist', async () => {
    // arrange
    bookingRepo.findOne.mockResolvedValue(null);

    // act
    const action = service.create(student, dto);

    // assert
    await expect(action).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects reviewing someone else booking', async () => {
    // arrange
    bookingRepo.findOne.mockResolvedValue({ ...completedBooking, student: { id: 'other' } });

    // act
    const action = service.create(student, dto);

    // assert
    await expect(action).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a booking that is not COMPLETED', async () => {
    // arrange
    bookingRepo.findOne.mockResolvedValue({ ...completedBooking, status: BookingStatus.PENDING });

    // act
    const action = service.create(student, dto);

    // assert
    await expect(action).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a duplicate review', async () => {
    // arrange
    bookingRepo.findOne.mockResolvedValue(completedBooking);
    reviewRepo.findOne.mockResolvedValue({ id: 'existing' });

    // act
    const action = service.create(student, dto);

    // assert
    await expect(action).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates a review', async () => {
    // arrange
    bookingRepo.findOne.mockResolvedValue(completedBooking);
    reviewRepo.findOne.mockResolvedValue(null);

    // act
    const result = await service.create(student, dto);

    // assert
    expect(result.rating).toBe(5);
    expect(reviewRepo.save).toHaveBeenCalled();
  });

  it('returns the reviews and the average for a tutor', async () => {
    // arrange
    reviewRepo.find.mockResolvedValue([{ id: 'review-1', rating: 5 }]);

    // act
    const result = await service.findByTutor('tutor-1');

    // assert
    expect(reviewRepo.find).toHaveBeenCalled();
    expect(result.count).toBe(1);
    expect(result.average).toBe(4.5);
    expect(result.reviews).toHaveLength(1);
  });

  it('returns average 0 when the tutor has no reviews', async () => {
    // arrange
    reviewRepo.find.mockResolvedValue([]);
    reviewRepo.createQueryBuilder.mockReturnValue(queryBuilderMock({ avg: null }));

    // act
    const result = await service.findByTutor('tutor-1');

    // assert
    expect(result.count).toBe(0);
    expect(result.average).toBe(0);
  });

  it('trims the comment before saving', async () => {
    bookingRepo.findOne.mockResolvedValue(completedBooking);
    reviewRepo.findOne.mockResolvedValue(null);

    const result = await service.create(student, { ...dto, comment: '  Explica claro.  ' });

    expect(result.comment).toBe('Explica claro.');
  });

  it('maps a unique violation and an unexpected save error', async () => {
    bookingRepo.findOne.mockResolvedValue(completedBooking);
    reviewRepo.findOne.mockResolvedValue(null);
    reviewRepo.save.mockRejectedValueOnce({ code: '23505', detail: 'duplicated' });

    await expect(service.create(student, dto)).rejects.toBeInstanceOf(ConflictException);

    reviewRepo.save.mockRejectedValueOnce(new Error('db down'));
    await expect(service.create(student, dto)).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
