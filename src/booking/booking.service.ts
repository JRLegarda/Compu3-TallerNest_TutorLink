import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from './entities/booking.entity.js';
import { TutorProfile } from '../tutor/entities/tutor-profile.entity.js';
import { Subject } from '../subject/entities/subject.entity.js';
import { User } from '../user/entities/user.entity.js';
import { CreateBooking } from './dto/create-booking.js';
import { FilterBooking } from './dto/filter-booking.dto.js';
import { BookingStatus } from './enums/booking-status.enum.js';

const ACTIVE_STATUSES = [BookingStatus.PENDING, BookingStatus.CONFIRMED];

@Injectable()
export class BookingService {
  private readonly logger = new Logger('BookingService');

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(TutorProfile)
    private readonly tutorRepository: Repository<TutorProfile>,
    @InjectRepository(Subject)
    private readonly subjectRepository: Repository<Subject>,
  ) {}

  async create(student: User, dto: CreateBooking) {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new BadRequestException('startAt and endAt must be valid dates');
    }
    if (endAt <= startAt) {
      throw new BadRequestException('endAt must be after startAt');
    }
    if (startAt <= new Date()) {
      throw new BadRequestException('startAt must be in the future');
    }

    const subject = await this.subjectRepository.findOneBy({ id: dto.subjectId });
    if (!subject) throw new NotFoundException(`Subject with id ${dto.subjectId} not found`);

    const tutorProfile = await this.tutorRepository.findOne({
      where: { id: dto.tutorProfileId },
      relations: { subjects: true, user: true },
    });
    if (!tutorProfile) {
      throw new NotFoundException(`Tutor with id ${dto.tutorProfileId} not found`);
    }
    if (!tutorProfile.user.isActive) {
      throw new BadRequestException('The tutor is not active');
    }

    // El tutor tiene que dictar la materia reservada
    const teachesSubject = tutorProfile.subjects.some((s) => s.id === subject.id);
    if (!teachesSubject) {
      throw new BadRequestException('The tutor does not teach this subject');
    }

    // No puede haber cruce de horario con otra reserva activa de ese tutor
    const overlap = await this.bookingRepository
      .createQueryBuilder('booking')
      .innerJoin('booking.tutorProfile', 'tp')
      .where('tp.id = :tutorProfileId', { tutorProfileId: tutorProfile.id })
      .andWhere('booking.status IN (:...statuses)', { statuses: ACTIVE_STATUSES })
      .andWhere('booking.startAt < :endAt AND booking.endAt > :startAt', { startAt, endAt })
      .getOne();
    if (overlap) {
      throw new ConflictException('The tutor already has an active booking in that time range');
    }

    try {
      const booking = this.bookingRepository.create({
        student,
        tutorProfile,
        subject,
        startAt,
        endAt,
        status: BookingStatus.PENDING,
      });
      return await this.bookingRepository.save(booking);
    } catch (error) {
      this.handleException(error);
    }
  }

  // Solo ve las reservas donde soy estudiante o soy el tutor
  findMine(user: User, { limit = 10, skip = 0, status }: FilterBooking) {
    const query = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.student', 'student')
      .leftJoinAndSelect('booking.tutorProfile', 'tutorProfile')
      .leftJoinAndSelect('tutorProfile.user', 'tutorUser')
      .leftJoinAndSelect('tutorProfile.subjects', 'tutorSubjects')
      .leftJoinAndSelect('booking.subject', 'subject')
      .where('student.id = :userId OR tutorUser.id = :userId', { userId: user.id });

    if (status) {
      query.andWhere('booking.status = :status', { status });
    }

    return query.orderBy('booking.startAt', 'ASC').take(limit).skip(skip).getMany();
  }

  async confirm(id: string, user: User) {
    const booking = await this.findOneOrFail(id);
    this.assertTutorOwner(booking, user);

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Only PENDING bookings can be confirmed');
    }

    // Revalidar cruce antes de confirmar (otra reserva pudo confirmarse en el medio)
    const overlap = await this.bookingRepository
      .createQueryBuilder('b')
      .innerJoin('b.tutorProfile', 'tp')
      .where('tp.id = :tutorProfileId', { tutorProfileId: booking.tutorProfile.id })
      .andWhere('b.id != :id', { id })
      .andWhere('b.status = :confirmed', { confirmed: BookingStatus.CONFIRMED })
      .andWhere('b.startAt < :endAt AND b.endAt > :startAt', {
        startAt: booking.startAt,
        endAt: booking.endAt,
      })
      .getOne();
    if (overlap) {
      throw new ConflictException('The tutor already has a confirmed booking in that time range');
    }

    booking.status = BookingStatus.CONFIRMED;
    try {
      return await this.bookingRepository.save(booking);
    } catch (error) {
      this.handleException(error);
    }
  }

  async cancel(id: string, user: User) {
    const booking = await this.findOneOrFail(id);
    this.assertParty(booking, user);

    if (
      booking.status !== BookingStatus.PENDING &&
      booking.status !== BookingStatus.CONFIRMED
    ) {
      throw new BadRequestException('Only PENDING or CONFIRMED bookings can be cancelled');
    }

    booking.status = BookingStatus.CANCELLED;
    try {
      return await this.bookingRepository.save(booking);
    } catch (error) {
      this.handleException(error);
    }
  }

  async complete(id: string, user: User) {
    const booking = await this.findOneOrFail(id);
    this.assertTutorOwner(booking, user);

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Only CONFIRMED bookings can be completed');
    }

    booking.status = BookingStatus.COMPLETED;
    try {
      return await this.bookingRepository.save(booking);
    } catch (error) {
      this.handleException(error);
    }
  }

  private async findOneOrFail(id: string) {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: { student: true, tutorProfile: { user: true, subjects: true }, subject: true },
    });
    if (!booking) throw new NotFoundException(`Booking with id ${id} not found`);
    return booking;
  }

  // Solo el tutor dueño confirma o completa
  private assertTutorOwner(booking: Booking, user: User) {
    if (booking.tutorProfile.user.id !== user.id) {
      throw new ForbiddenException('Only the tutor of this booking can do this');
    }
  }

  // Solo una parte de la reserva la cancela (estudiante dueño o tutor dueño)
  private assertParty(booking: Booking, user: User) {
    const isStudent = booking.student.id === user.id;
    const isTutor = booking.tutorProfile.user.id === user.id;
    if (!isStudent && !isTutor) {
      throw new ForbiddenException('Only the owner of this booking can do this');
    }
  }

  private handleException(error: any): never {
    if (error.code === '23505') throw new ConflictException(error.detail);
    this.logger.error(error);
    throw new InternalServerErrorException('Unexpected error, check server logs');
  }
}
