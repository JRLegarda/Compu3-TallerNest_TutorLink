import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './user/user.module.js';
import { SubjectModule } from './subject/subject.module.js';
import { TutorModule } from './tutor/tutor.module.js';
import { BookingModule } from './booking/booking.module.js';
import { ReviewModule } from './review/review.module.js';
import { SeedModule } from './seed/seed.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 5432),
      database: process.env.DB_NAME,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      autoLoadEntities: true,
      synchronize: process.env.DB_SYNCHRONIZE === 'true', // Solo en desarrollo, no usar en producción
      migrationsRun: process.env.DB_MIGRATIONS_RUN === 'true',
      migrations: [__dirname + '/migrations/*{.ts,.js}'],

    }),
    UserModule,
    SubjectModule,
    TutorModule,
    BookingModule,
    ReviewModule,
    SeedModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
