import {BadRequestException,ConflictException,Injectable,InternalServerErrorException,Logger,NotFoundException,UnauthorizedException,} from '@nestjs/common';
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
      });

      await this.userRepository.save(user);
      delete user.password;

      return {
        ...user,
        token: this.getJwtToken({ id: user.id, email: user.email }),
      };
    } catch (error) {
      this.handleException(error);
    }
  }

  async login(loginDto: Login) {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, email: true, password: true, isActive: true },
    });

    if (!user || !bcrypt.compareSync(password, user.password!)) {
      throw new UnauthorizedException('Email or password incorrect');
    }
    if (!user.isActive) throw new UnauthorizedException('User is not active');

    return {
      id: user.id,
      email: user.email,
      token: this.getJwtToken({ id: user.id, email: user.email }),
    };
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

  async updateRoles(id: string, { roles }: UpdateRoles) {
    const user = await this.findOne(id);
    user.roles = roles;
    return this.userRepository.save(user);
  }

  async deactivate(id: string, currentUser: User) {
    if (id === currentUser.id) {
      throw new BadRequestException('You cannot deactivate yourself');
    }
    const user = await this.findOne(id);
    user.isActive = false;
    await this.userRepository.save(user);
    return { message: `User ${user.email} deactivated` };
  }

  

  private getJwtToken(jwtPayload: JwtPayload) {
    return this.jwtService.sign(jwtPayload);
  }

  private handleException(error: any): never {
    if (error.code === '23505') throw new ConflictException(error.detail);
    this.logger.error(error);
    throw new InternalServerErrorException('Unexpected error, check server logs');
  }
}
