import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject } from './entities/subject.entity.js';
import { CreateSubject } from './dto/create-subject.dto.js';
import { UpdateSubject } from './dto/update-subject.dto.js';
import { FilterSubject } from './dto/filter-subject.dto.js';

@Injectable()
export class SubjectService {
  private readonly logger = new Logger('SubjectService');

  constructor(
    @InjectRepository(Subject)
    private readonly subjectRepository: Repository<Subject>,
  ) {}

  async create(createSubject: CreateSubject) {
    try {
      const subject = this.subjectRepository.create(createSubject);
      await this.subjectRepository.save(subject);
      return subject;
    } catch (error) {
      this.handleException(error);
    }
  }

  findAll({limit = 10,skip = 0,university,semester,search,}: FilterSubject) {
    const query = this.subjectRepository.createQueryBuilder('subject');

    if (university?.trim()) {
      query.andWhere('UPPER(subject.university) = :university', {
        university: university.toUpperCase().trim(),
      });
    }

    if (semester?.trim()) {
      query.andWhere('UPPER(subject.semester) = :semester', {
        semester: semester.toUpperCase().trim(),
      });
    }

    if (search?.trim()) {
      query.andWhere('UPPER(subject.name) LIKE :search', {
        search: `%${search.toUpperCase().trim()}%`,
      });
    }

    return query
      .orderBy('subject.name', 'ASC')
      .take(limit)
      .skip(skip)
      .getMany();
  }

  async findOne(id: string) {
    const subject = await this.subjectRepository.findOneBy({ id });
    if (!subject) {
      throw new NotFoundException(`Subject with id ${id} not found`);
    }
    return subject;
  }

  async update(id: string, updateSubject: UpdateSubject) {
    const subject = await this.subjectRepository.preload({
      id,
      ...updateSubject,
    });

    if (!subject) {
      throw new NotFoundException(`Subject with id ${id} not found`);
    }

    try {
      return await this.subjectRepository.save(subject);
    } catch (error) {
      this.handleException(error);
    }
  }

  async remove(id: string) {
    const subject = await this.findOne(id);
    await this.subjectRepository.remove(subject);
    return { ...subject, id };
  }

  private handleException(error: any): never {
    if (error.code === '23505') throw new ConflictException(error.detail);
    this.logger.error(error);
    throw new InternalServerErrorException(
      'Unexpected error, check server logs',
    );
  }
}
