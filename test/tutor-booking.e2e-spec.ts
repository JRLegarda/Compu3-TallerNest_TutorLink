import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { AppModule } from './../src/app.module.js';

// Esta suite necesita PostgreSQL arriba y el .env del README.
// Se ejecuta con: RUN_E2E=true npm run test:e2e
const enabled = process.env.RUN_E2E === 'true';

describe.skipIf(!enabled)('Tutor + Booking (e2e)', () => {
  let app: INestApplication;

  const seedKey = process.env.SEED_KEY ?? '';
  let adminToken = '';
  let tutorToken = '';
  let studentToken = '';
  let subjectId = '';
  let otherSubjectId = '';
  let tutorId = '';
  let bookingId = '';

  // Franja de mañana 14:00-15:00 UTC y 16:00-17:00 UTC
  const slot = (hour: number) => {
    const start = new Date(Date.now() + 24 * 3600 * 1000);
    start.setUTCHours(hour, 0, 0, 0);
    return {
      startAt: start.toISOString(),
      endAt: new Date(start.getTime() + 3600 * 1000).toISOString(),
    };
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('tutorlink');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects the seed with a wrong key', async () => {
    await request(app.getHttpServer()).get('/tutorlink/seed?key=wrong').expect(401);
  });

  it('runs the seed', async () => {
    const res = await request(app.getHttpServer())
      .get(`/tutorlink/seed?key=${seedKey}`)
      .expect(200);

    expect(res.body.message).toBe('SEED EXECUTED');
  });

  it('admin logs in and wrong passwords fail', async () => {
    const res = await request(app.getHttpServer())
      .post('/tutorlink/user/auth')
      .send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })
      .expect(201);

    adminToken = res.body.token;
    expect(adminToken).toBeTruthy();

    await request(app.getHttpServer())
      .post('/tutorlink/user/auth')
      .send({ email: process.env.ADMIN_EMAIL, password: 'WrongPass1' })
      .expect(401);
  });

  it('admin creates a subject and duplicates fail', async () => {
    const res = await request(app.getHttpServer())
      .post('/tutorlink/subject')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Ecuaciones Diferenciales', university: 'ICESI', semester: '4' })
      .expect(201);

    subjectId = res.body.id;
    expect(subjectId).toBeTruthy();

    await request(app.getHttpServer())
      .post('/tutorlink/subject')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Ecuaciones Diferenciales', university: 'ICESI', semester: '4' })
      .expect(409);
  });

  it('student logs in and lists subjects', async () => {
    const login = await request(app.getHttpServer())
      .post('/tutorlink/user/auth')
      .send({ email: 'ana@example.com', password: 'Secreta123' })
      .expect(201);
    studentToken = login.body.token;

    const list = await request(app.getHttpServer())
      .get('/tutorlink/subject?university=ICESI&limit=10&skip=0')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    expect(list.body.length).toBeGreaterThan(0);
    // Materia del seed que tutor1 NO dicta (dicta Cálculo I y Álgebra Lineal)
    otherSubjectId = list.body.find((s: any) => s.name === 'Programación I').id;
  });

  it('tutor creates their profile', async () => {
    const login = await request(app.getHttpServer())
      .post('/tutorlink/user/auth')
      .send({ email: 'tutor1@example.com', password: 'Secreta123' })
      .expect(201);
    tutorToken = login.body.token;

    const res = await request(app.getHttpServer())
      .put('/tutorlink/tutor/me')
      .set('Authorization', `Bearer ${tutorToken}`)
      .send({
        bio: 'Estudiante de ingeniería con 3 semestres dando tutorías de cálculo.',
        hourlyRate: 15000,
        academicHistory: 'Monitor de Cálculo I (2025), promedio 4.5.',
        university: 'ICESI',
        subjectIds: [subjectId],
      })
      .expect(200);

    tutorId = res.body.id;
    expect(res.body.subjects).toHaveLength(1);
  });

  it('forbids students from creating tutor profiles', async () => {
    await request(app.getHttpServer())
      .put('/tutorlink/tutor/me')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        bio: 'Quiero ser tutor sin tener el rol.',
        hourlyRate: 10000,
        academicHistory: 'Sin historial todavía.',
        university: 'ICESI',
        subjectIds: [subjectId],
      })
      .expect(403);
  });

  it('lists tutors with filters', async () => {
    const res = await request(app.getHttpServer())
      .get(`/tutorlink/tutor?subjectId=${subjectId}&maxRate=20000&limit=10&skip=0`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    expect(res.body.map((t: any) => t.id)).toContain(tutorId);
  });

  it('admin verifies the tutor', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/tutorlink/tutor/${tutorId}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.isVerified).toBe(true);
  });

  it('student creates a booking', async () => {
    const res = await request(app.getHttpServer())
      .post('/tutorlink/booking')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ tutorProfileId: tutorId, subjectId, ...slot(14) })
      .expect(201);

    bookingId = res.body.id;
    expect(res.body.status).toBe('PENDING');
  });

  it('rejects overlapping bookings', async () => {
    await request(app.getHttpServer())
      .post('/tutorlink/booking')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ tutorProfileId: tutorId, subjectId, ...slot(14) })
      .expect(409);
  });

  it('rejects subjects the tutor does not teach', async () => {
    await request(app.getHttpServer())
      .post('/tutorlink/booking')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ tutorProfileId: tutorId, subjectId: otherSubjectId, ...slot(16) })
      .expect(400);
  });

  it('student sees the booking in /mine', async () => {
    const res = await request(app.getHttpServer())
      .get('/tutorlink/booking/mine?limit=10&skip=0')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    expect(res.body.map((b: any) => b.id)).toContain(bookingId);
  });

  it('rejects unauthenticated booking creation', async () => {
    await request(app.getHttpServer())
      .post('/tutorlink/booking')
      .send({ tutorProfileId: tutorId, subjectId, ...slot(16) })
      .expect(401);
  });

  it('owning tutor confirms and completes the booking', async () => {
    const confirmed = await request(app.getHttpServer())
      .patch(`/tutorlink/booking/${bookingId}/confirm`)
      .set('Authorization', `Bearer ${tutorToken}`)
      .expect(200);
    expect(confirmed.body.status).toBe('CONFIRMED');

    const completed = await request(app.getHttpServer())
      .patch(`/tutorlink/booking/${bookingId}/complete`)
      .set('Authorization', `Bearer ${tutorToken}`)
      .expect(200);
    expect(completed.body.status).toBe('COMPLETED');
  });

  it('student cancels another booking', async () => {
    const created = await request(app.getHttpServer())
      .post('/tutorlink/booking')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ tutorProfileId: tutorId, subjectId, ...slot(16) })
      .expect(201);

    const cancelled = await request(app.getHttpServer())
      .patch(`/tutorlink/booking/${created.body.id}/cancel`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);
    expect(cancelled.body.status).toBe('CANCELLED');
  });
});
