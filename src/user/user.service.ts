import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { User } from './entities/user.entity.js';
import { Register } from './dto/register.dto.js';
import { Login } from './dto/login.dto.js';
import { UpdateRoles } from './dto/update-roles.dto.js';
import { JwtPayload } from './interfaces/jwt.interface.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { UserRole } from './enums/user-role.enum.js';

@Injectable()
export class UserService {
  private readonly logger = new Logger('UserService');

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async create(registerDto: Register) {
    const { password, ...userDetails } = registerDto;

    try {
      const user = this.userRepository.create({
        ...userDetails,
        password: this.encryptPassword(password),
        roles: [UserRole.STUDENT],
        tokenVersion: 0,
      });

      await this.userRepository.save(user);

      return this.authResponse(user);
    } catch (error) {
      this.handleException(error);
    }
  }

  async login(loginDto: Login) {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        email: true,
        password: true,
        fullName: true,
        isActive: true,
        roles: true,
        tokenVersion: true,
      },
    });

    if (!user?.password || !bcrypt.compareSync(password, user.password)) {
      throw new UnauthorizedException('Email or password incorrect');
    }
    if (!user.isActive) throw new UnauthorizedException('User is not active');

    return this.authResponse(user);
  }

  async logout(id: string) {
    await this.findOne(id);
    await this.userRepository.increment({ id }, 'tokenVersion', 1);
    return { message: 'Session closed' };
  }

  encryptPassword(password: string) {
    return bcrypt.hashSync(password, 10);
  }

  findAll({ limit = 10, skip = 0 }: PaginationDto) {
    return this.userRepository.find({
      take: limit,
      skip,
      order: { fullName: 'ASC' },
    });
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) throw new NotFoundException(`User with id ${id} not found`);
    return user;
  }

  async updateRoles(id: string, { roles }: UpdateRoles, currentUser: User) {
    if (id === currentUser.id && !roles.includes(UserRole.ADMIN)) {
      throw new BadRequestException('You cannot remove your own admin role');
    }

    await this.findOne(id);
    await this.userRepository.update(id, { roles });
    return this.findOne(id);
  }

  async deactivate(id: string, currentUser: User) {
    if (id === currentUser.id) {
      throw new BadRequestException('You cannot deactivate yourself');
    }

    const user = await this.findOne(id);
    await this.userRepository.update(id, { isActive: false });
    await this.userRepository.increment({ id }, 'tokenVersion', 1);
    return { message: `User ${user.email} deactivated` };
  }

  private authResponse(user: User) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      isActive: user.isActive,
      roles: user.roles,
      token: this.getJwtToken({
        id: user.id,
        email: user.email,
        tokenVersion: user.tokenVersion ?? 0,
      }),
    };
  }

  private getJwtToken(jwtPayload: JwtPayload) {
    return this.jwtService.sign(jwtPayload);
  }

  private handleException(error: any): never {
    if (error.code === '23505') throw new ConflictException(error.detail);
    this.logger.error(error);
    throw new InternalServerErrorException(
      'Unexpected error, check server logs',
    );
  }
}
