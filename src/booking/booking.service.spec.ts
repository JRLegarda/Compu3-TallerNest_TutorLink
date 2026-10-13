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
import { Subject } from '../subject/entities/subject.entity.js';
import { TutorProfile } from '../tutor/entities/tutor-profile.entity.js';
import { User } from '../user/entities/user.entity.js';
import { UserRole } from '../user/enums/user-role.enum.js';
import { BookingService } from './booking.service.js';
import { CreateBooking } from './dto/create-booking.js';
import { Booking } from './entities/booking.entity.js';
import { BookingStatus } from './enums/booking-status.enum.js';

function queryBuilderMock(result: any) {
  const qb: any = {};
  qb.leftJoinAndSelect = vi.fn().mockReturnValue(qb);
  qb.innerJoin = vi.fn().mockReturnValue(qb);
  qb.where = vi.fn().mockReturnValue(qb);
  qb.andWhere = vi.fn().mockReturnValue(qb);
  qb.orderBy = vi.fn().mockReturnValue(qb);
  qb.take = vi.fn().mockReturnValue(qb);
  qb.skip = vi.fn().mockReturnValue(qb);
  qb.getMany = vi.fn().mockResolvedValue(result);
  qb.getOne = vi.fn().mockResolvedValue(result);
  return qb;
}

describe('BookingService', () => {
  let service: BookingService;
  let bookingRepo: any;
  let tutorRepo: any;
  let subjectRepo: any;

  const student = { id: 'student-1', roles: [UserRole.STUDENT] } as User;
  const stranger = { id: 'stranger-1', roles: [UserRole.STUDENT] } as User;
  const tutorUser = { id: 'tutor-user-1', isActive: true, roles: [UserRole.TUTOR] } as User;
  const subject = { id: 'subject-1' } as Subject;
  const tutorProfile = {
    id: 'tutor-1',
    user: tutorUser,
    subjects: [{ id: 'subject-1' }],
  } as unknown as TutorProfile;

  const futureDto = (): CreateBooking => {
    const start = new Date(Date.now() + 24 * 3600 * 1000);
    const end = new Date(start.getTime() + 3600 * 1000);
    return {
      tutorProfileId: 'tutor-1',
      subjectId: 'subject-1',
      startAt: start.toISOString(),
      endAt: end.toISOString(),
    };
  };

  const storedBooking = (overrides: any = {}) =>
    ({
      id: 'booking-1',
      student,
      tutorProfile,
      subject,
      startAt: new Date(futureDto().startAt),
      endAt: new Date(futureDto().endAt),
      status: BookingStatus.PENDING,
      ...overrides,
    }) as Booking;

  beforeEach(async () => {
    bookingRepo = {
      create: vi.fn(),
      save: vi.fn(),
      findOne: vi.fn(),
      createQueryBuilder: vi.fn(),
    };
    tutorRepo = { findOne: vi.fn() };
    subjectRepo = { findOneBy: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: getRepositoryToken(Booking), useValue: bookingRepo },
        { provide: getRepositoryToken(TutorProfile), useValue: tutorRepo },
        { provide: getRepositoryToken(Subject), useValue: subjectRepo },
      ],
    }).setLogger({
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      verbose: vi.fn(),
    })
    .compile();

    service = module.get<BookingService>(BookingService);
  });

  describe('create', () => {
    beforeEach(() => {
      subjectRepo.findOneBy.mockResolvedValue(subject);
      tutorRepo.findOne.mockResolvedValue(tutorProfile);
      bookingRepo.createQueryBuilder.mockReturnValue(queryBuilderMock(null));
      bookingRepo.create.mockImplementation((b: any) => b);
      bookingRepo.save.mockImplementation(async (b: any) => ({ id: 'booking-1', ...b }));
    });

    it('creates a PENDING booking when everything is valid', async () => {
      const booking: any = await service.create(student, futureDto());

      expect(booking.status).toBe(BookingStatus.PENDING);
      expect(bookingRepo.save).toHaveBeenCalled();
    });

    it('rejects endAt before startAt', async () => {
      const dto = futureDto();
      dto.endAt = dto.startAt;

      await expect(service.create(student, dto)).rejects.toThrow(BadRequestException);
      expect(bookingRepo.save).not.toHaveBeenCalled();
    });

    it('rejects startAt in the past', async () => {
      const dto = futureDto();
      dto.startAt = new Date(Date.now() - 3600 * 1000).toISOString();

      await expect(service.create(student, dto)).rejects.toThrow(BadRequestException);
    });

    it('throws NotFound when the subject or tutor do not exist', async () => {
      subjectRepo.findOneBy.mockResolvedValue(null);
      await expect(service.create(student, futureDto())).rejects.toThrow(NotFoundException);

      subjectRepo.findOneBy.mockResolvedValue(subject);
      tutorRepo.findOne.mockResolvedValue(null);
      await expect(service.create(student, futureDto())).rejects.toThrow(NotFoundException);
    });

    it('rejects inactive tutors and subjects the tutor does not teach', async () => {
      tutorRepo.findOne.mockResolvedValue({ ...tutorProfile, user: { ...tutorUser, isActive: false } });
      await expect(service.create(student, futureDto())).rejects.toThrow(BadRequestException);

      tutorRepo.findOne.mockResolvedValue({ ...tutorProfile, subjects: [{ id: 'other' }] });
      await expect(service.create(student, futureDto())).rejects.toThrow(BadRequestException);
    });

    it('rejects overlapping bookings with Conflict', async () => {
      bookingRepo.createQueryBuilder.mockReturnValue(queryBuilderMock(storedBooking()));

      await expect(service.create(student, futureDto())).rejects.toThrow(ConflictException);
    });

    it('rejects dates that are not real dates', async () => {
      const dto = futureDto();
      dto.startAt = 'manana';

      await expect(service.create(student, dto)).rejects.toThrow(BadRequestException);
      expect(bookingRepo.save).not.toHaveBeenCalled();
    });

    it('maps a unique violation and an unexpected save error', async () => {
      bookingRepo.save.mockRejectedValueOnce({ code: '23505', detail: 'duplicated' });
      await expect(service.create(student, futureDto())).rejects.toThrow(ConflictException);

      bookingRepo.save.mockRejectedValueOnce(new Error('db down'));
      await expect(service.create(student, futureDto())).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findMine', () => {
    it('returns bookings where I am student or tutor', async () => {
      const qb = queryBuilderMock([storedBooking()]);
      bookingRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findMine(student, {} as any);

      expect(result).toHaveLength(1);
      expect(qb.where).toHaveBeenCalledWith('student.id = :userId OR tutorUser.id = :userId', {
        userId: student.id,
      });
    });

    it('filters my bookings by status', async () => {
      const qb = queryBuilderMock([]);
      bookingRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findMine(tutorUser, { status: BookingStatus.CONFIRMED } as any);

      expect(qb.andWhere).toHaveBeenCalledWith('booking.status = :status', {
        status: BookingStatus.CONFIRMED,
      });
    });
  });

  describe('confirm / cancel / complete', () => {
    it('lets the owning tutor confirm a PENDING booking', async () => {
      bookingRepo.findOne.mockResolvedValue(storedBooking());
      bookingRepo.createQueryBuilder.mockReturnValue(queryBuilderMock(null));
      bookingRepo.save.mockImplementation(async (b: any) => b);

      const booking: any = await service.confirm('booking-1', tutorUser);

      expect(booking.status).toBe(BookingStatus.CONFIRMED);
    });

    it('forbids confirm to non-owners and rejects non-PENDING status', async () => {
      bookingRepo.findOne.mockResolvedValue(storedBooking());
      bookingRepo.createQueryBuilder.mockReturnValue(queryBuilderMock(null));

      await expect(service.confirm('booking-1', stranger)).rejects.toThrow(ForbiddenException);

      bookingRepo.findOne.mockResolvedValue(storedBooking({ status: BookingStatus.CONFIRMED }));
      await expect(service.confirm('booking-1', tutorUser)).rejects.toThrow(BadRequestException);

      bookingRepo.findOne.mockResolvedValue(null);
      await expect(service.confirm('missing', tutorUser)).rejects.toThrow(NotFoundException);
    });

    it('lets the student cancel and forbids strangers', async () => {
      bookingRepo.findOne.mockResolvedValue(storedBooking());
      bookingRepo.save.mockImplementation(async (b: any) => b);

      const booking: any = await service.cancel('booking-1', student);

      expect(booking.status).toBe(BookingStatus.CANCELLED);
      await expect(service.cancel('booking-1', stranger)).rejects.toThrow(ForbiddenException);
    });

    it('rejects cancelling a COMPLETED booking', async () => {
      bookingRepo.findOne.mockResolvedValue(storedBooking({ status: BookingStatus.COMPLETED }));

      await expect(service.cancel('booking-1', student)).rejects.toThrow(BadRequestException);
    });

    it('lets the owning tutor complete a CONFIRMED booking', async () => {
      bookingRepo.findOne.mockResolvedValue(storedBooking({ status: BookingStatus.CONFIRMED }));
      bookingRepo.save.mockImplementation(async (b: any) => b);

      const booking: any = await service.complete('booking-1', tutorUser);

      expect(booking.status).toBe(BookingStatus.COMPLETED);
      await expect(service.complete('booking-1', student)).rejects.toThrow(ForbiddenException);
    });

    it('rejects completing a PENDING booking', async () => {
      bookingRepo.findOne.mockResolvedValue(storedBooking());

      await expect(service.complete('booking-1', tutorUser)).rejects.toThrow(BadRequestException);
    });

    it('rejects confirming when another booking is already confirmed in that range', async () => {
      bookingRepo.findOne.mockResolvedValue(storedBooking());
      bookingRepo.createQueryBuilder.mockReturnValue(queryBuilderMock(storedBooking({ id: 'other' })));

      await expect(service.confirm('booking-1', tutorUser)).rejects.toThrow(ConflictException);
      expect(bookingRepo.save).not.toHaveBeenCalled();
    });

    it('lets the owning tutor cancel and rejects a second cancel', async () => {
      bookingRepo.findOne.mockResolvedValue(storedBooking({ status: BookingStatus.CONFIRMED }));
      bookingRepo.save.mockImplementation(async (b: any) => b);

      const booking: any = await service.cancel('booking-1', tutorUser);
      expect(booking.status).toBe(BookingStatus.CANCELLED);

      bookingRepo.findOne.mockResolvedValue(storedBooking({ status: BookingStatus.CANCELLED }));
      await expect(service.cancel('booking-1', tutorUser)).rejects.toThrow(BadRequestException);
    });

    it('maps an unexpected error when completing', async () => {
      bookingRepo.findOne.mockResolvedValue(storedBooking({ status: BookingStatus.CONFIRMED }));
      bookingRepo.save.mockRejectedValue(new Error('db down'));

      await expect(service.complete('booking-1', tutorUser)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
