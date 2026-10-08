import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TutorProfile } from './entities/tutor-profile.entity.js';
import { Subject } from '../subject/entities/subject.entity.js';
import { User } from '../user/entities/user.entity.js';
import { CreateTutorProfile } from './dto/create-tutor-profile.js';
import { FilterTutor } from './dto/filter-tutor.dto.js';

@Injectable()
export class TutorService {
  private readonly logger = new Logger('TutorService');

  constructor(
    @InjectRepository(TutorProfile)
    private readonly tutorRepository: Repository<TutorProfile>,
    @InjectRepository(Subject)
    private readonly subjectRepository: Repository<Subject>,
  ) {}

  // PUT /tutor/me: crea el perfil o lo reemplaza si ya existe
  async upsertMyProfile(user: User, dto: CreateTutorProfile) {
    const subjects = await this.findSubjectsOrFail(dto.subjectIds);

    try {
      const existing = await this.tutorRepository.findOne({
        where: { user: { id: user.id } },
      });

      if (!existing) {
        const profile = this.tutorRepository.create({
          bio: dto.bio,
          hourlyRate: dto.hourlyRate,
          academicHistory: dto.academicHistory,
          university: dto.university.trim(),
          subjects,
          user,
        });
        return await this.tutorRepository.save(profile);
      }

      existing.bio = dto.bio;
      existing.hourlyRate = dto.hourlyRate;
      existing.academicHistory = dto.academicHistory;
      existing.university = dto.university.trim();
      existing.subjects = subjects;
      return await this.tutorRepository.save(existing);
    } catch (error) {
      this.handleException(error);
    }
  }

  findAll({ limit = 10, skip = 0, subjectId, university, maxRate, verified }: FilterTutor) {
    const query = this.tutorRepository
      .createQueryBuilder('tutor')
      .leftJoinAndSelect('tutor.user', 'user')
      .leftJoinAndSelect('tutor.subjects', 'subject');

    if (subjectId) {
      query.andWhere('subject.id = :subjectId', { subjectId });
    }

    if (university?.trim()) {
      query.andWhere('UPPER(tutor.university) = :university', {
        university: university.toUpperCase().trim(),
      });
    }

    if (maxRate !== undefined) {
      query.andWhere('tutor.hourlyRate <= :maxRate', { maxRate });
    }

    if (verified !== undefined) {
      query.andWhere('tutor.isVerified = :verified', { verified });
    }

    return query
      .orderBy('tutor.hourlyRate', 'ASC')
      .take(limit)
      .skip(skip)
      .getMany();
  }

  async findOne(id: string) {
    const tutor = await this.tutorRepository.findOne({
      where: { id },
      relations: { user: true, subjects: true },
    });
    if (!tutor) throw new NotFoundException(`Tutor with id ${id} not found`);
    return tutor;
  }

  async verify(id: string) {
    const tutor = await this.findOne(id);
    tutor.isVerified = true;
    try {
      return await this.tutorRepository.save(tutor);
    } catch (error) {
      this.handleException(error);
    }
  }

  private async findSubjectsOrFail(subjectIds: string[]) {
    const subjects = await this.subjectRepository.find({
      where: { id: In(subjectIds) },
    });
    if (subjects.length !== subjectIds.length) {
      throw new NotFoundException('One or more subjects do not exist');
    }
    return subjects;
  }

  private handleException(error: any): never {
    if (error.code === '23505') throw new ConflictException(error.detail);
    this.logger.error(error);
    throw new InternalServerErrorException('Unexpected error, check server logs');
  }
}
