import { Module } from '@nestjs/common';
import { UserService } from './user.service.js';
import { UserController } from './user.controller.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity.js';
import { PassportModule } from '@nestjs/passport'
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { UserRoleGuard } from './guards/user-role.guard.js';

@Module({
  controllers: [UserController],
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule.register({defaultStrategy: 'jwt'}),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET is not set');
        }

        return {
          secret,
          signOptions: {
            expiresIn: configService.get('JWT_EXPIRES_IN') ?? '1h',
          },
        };
      },
    }),
  ],
  providers: [UserService, ConfigService, JwtStrategy, UserRoleGuard],
  exports: [TypeOrmModule, PassportModule, JwtModule, JwtStrategy, UserRoleGuard, UserService]
})
export class UserModule {}
