import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from '../entities/user.entity.js';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../interfaces/jwt.interface.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    configService: ConfigService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not set');
    }

    super({
      secretOrKey: secret,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: payload.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        isActive: true,
        roles: true,
        tokenVersion: true,
      },
    });

    if (!user) throw new UnauthorizedException('Token not valid');
    if (!user.isActive) throw new UnauthorizedException('User is not active');
    if (user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Token not valid');
    }

    delete user.tokenVersion;
    return user;
  }
}
