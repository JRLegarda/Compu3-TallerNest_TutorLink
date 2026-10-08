import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../user/entities/user.entity.js';
import { Subject } from '../subject/entities/subject.entity.js';
import { TutorProfile } from '../tutor/entities/tutor-profile.entity.js';
import { UserService } from '../user/user.service.js';
import { UserRole } from '../user/enums/user-role.enum.js';
import { seedStudents, seedSubjects, seedTutors } from './data/seed.data.js';

@Injectable()
export class SeedService {
  private readonly logger = new Logger('SeedService');

  constructor(
    private readonly dataSource: DataSource,
    private readonly userService: UserService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Subject)
    private readonly subjectRepository: Repository<Subject>,
    @InjectRepository(TutorProfile)
    private readonly tutorRepository: Repository<TutorProfile>,
  ) {}

  async runSeed() {
    await this.deleteAll();

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminFullName = process.env.ADMIN_FULL_NAME;
    if (!adminEmail || !adminPassword || !adminFullName) {
      throw new InternalServerErrorException(
        'ADMIN_EMAIL, ADMIN_PASSWORD and ADMIN_FULL_NAME must be set',
      );
    }

    const admin = this.userRepository.create({
      email: adminEmail,
      password: this.userService.encryptPassword(adminPassword),
      fullName: adminFullName,
      isActive: true,
      roles: [UserRole.ADMIN],
      tokenVersion: 0,
    });
    await this.userRepository.save(admin);

    const subjects: Subject[] = [];
    for (const data of seedSubjects) {
      subjects.push(await this.subjectRepository.save(this.subjectRepository.create(data)));
    }
    const subjectByName = new Map(subjects.map((s) => [s.name, s]));

    for (const data of seedStudents) {
      const student = this.userRepository.create({
        email: data.email,
        password: this.userService.encryptPassword(data.password),
        fullName: data.fullName,
        isActive: true,
        roles: [UserRole.STUDENT],
        tokenVersion: 0,
      });
      await this.userRepository.save(student);
    }

    for (const data of seedTutors) {
      const tutorUser = this.userRepository.create({
        email: data.email,
        password: this.userService.encryptPassword(data.password),
        fullName: data.fullName,
        isActive: true,
        roles: [UserRole.TUTOR],
        tokenVersion: 0,
      });
      await this.userRepository.save(tutorUser);

      const profile = this.tutorRepository.create({
        bio: data.bio,
        hourlyRate: data.hourlyRate,
        academicHistory: data.academicHistory,
        university: data.university,
        isVerified: true,
        user: tutorUser,
        subjects: data.subjectNames.map((name) => subjectByName.get(name)!),
      });
      await this.tutorRepository.save(profile);
    }

    this.logger.log('SEED EXECUTED');
    return {
      message: 'SEED EXECUTED',
      admin: adminEmail,
      subjects: subjects.length,
      students: seedStudents.length,
      tutors: seedTutors.length,
    };
  }

  // Borrar en este orden por las llaves foráneas
  private async deleteAll() {
    await this.dataSource.query('DELETE FROM "booking"');
    await this.dataSource.query('DELETE FROM "tutor_profile_subjects"');
    await this.dataSource.query('DELETE FROM "tutor_profile"');
    await this.dataSource.query('DELETE FROM "subject"');
    await this.dataSource.query('DELETE FROM "user"');
  }
}
