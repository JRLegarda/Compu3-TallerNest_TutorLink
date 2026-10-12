import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from './../src/app.module.js';

// Recorre los escenarios de TutorLink: búsqueda por contexto, horario,
// roles y reseñas. Necesita PostgreSQL y el .env. Corre con RUN_E2E=true.
const enabled = process.env.RUN_E2E === 'true';

describe.skipIf(!enabled)('Marketplace rules (e2e)', () => {
  let app: INestApplication;

  const seedKey = process.env.SEED_KEY ?? '';
  let anaToken = '';
  let luisToken = '';
  let tutorToken = '';
  let calculoId = '';
  let programacionId = '';
  let tutorId = '';
  let bookingId = '';

  const hoursFromNow = (hours: number) => {
    const start = new Date(Date.now() + hours * 3600 * 1000);
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

  async function login(email: string, password = 'Secreta123') {
    const res = await request(app.getHttpServer())
      .post('/tutorlink/user/auth')
      .send({ email, password })
      .expect(201);
    return res.body.token as string;
  }

  it('loads the seed and the three roles', async () => {
    await request(app.getHttpServer()).get('/tutorlink/seed?key=no-es').expect(401);

    const seed = await request(app.getHttpServer())
      .get(`/tutorlink/seed?key=${seedKey}`)
      .expect(200);
    expect(seed.body).toMatchObject({ message: 'SEED EXECUTED', subjects: 4, students: 2, tutors: 2 });

    anaToken = await login('ana@example.com');
    luisToken = await login('luis@example.com');
    tutorToken = await login('tutor1@example.com');
  });

  it('finds a subject by the university context the student is searching', async () => {
    const list = await request(app.getHttpServer())
      .get('/tutorlink/subject?university=icesi&search=cálculo&limit=10&skip=0')
      .set('Authorization', `Bearer ${anaToken}`)
      .expect(200);

    const calculo = list.body.find((subject: { name: string }) => subject.name === 'Cálculo I');
    const programacion = (
      await request(app.getHttpServer())
        .get('/tutorlink/subject?search=Programación&limit=10&skip=0')
        .set('Authorization', `Bearer ${anaToken}`)
        .expect(200)
    ).body.find((subject: { name: string }) => subject.name === 'Programación I');

    expect(calculo).toBeTruthy();
    expect(programacion).toBeTruthy();
    calculoId = calculo.id;
    programacionId = programacion.id;
  });

  it('filters tutors by price and verification, the trust signals of the marketplace', async () => {
    const affordable = await request(app.getHttpServer())
      .get('/tutorlink/tutor?university=ICESI&maxRate=16000&verified=true&limit=10&skip=0')
      .set('Authorization', `Bearer ${anaToken}`)
      .expect(200);

    const tutor = affordable.body.find(
      (profile: { user: { email: string } }) => profile.user.email === 'tutor1@example.com',
    );
    expect(tutor).toBeTruthy();
    expect(tutor.hourlyRate).toBeLessThanOrEqual(16000);
    expect(tutor.isVerified).toBe(true);
    expect(affordable.body.some((profile: { hourlyRate: number }) => profile.hourlyRate > 16000)).toBe(
      false,
    );
    tutorId = tutor.id;

    const tooCheap = await request(app.getHttpServer())
      .get('/tutorlink/tutor?maxRate=1000&verified=true')
      .set('Authorization', `Bearer ${anaToken}`)
      .expect(200);
    expect(tooCheap.body).toHaveLength(0);
  });

  it('rejects bookings that are not a real future session', async () => {
    const past = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    await request(app.getHttpServer())
      .post('/tutorlink/booking')
      .set('Authorization', `Bearer ${anaToken}`)
      .send({
        tutorProfileId: tutorId,
        subjectId: calculoId,
        startAt: past,
        endAt: new Date().toISOString(),
      })
      .expect(400);

    const later = hoursFromNow(30);
    await request(app.getHttpServer())
      .post('/tutorlink/booking')
      .set('Authorization', `Bearer ${anaToken}`)
      .send({
        tutorProfileId: tutorId,
        subjectId: calculoId,
        startAt: later.endAt,
        endAt: later.startAt,
      })
      .expect(400);
  });

  it('blocks a tutor from booking and a student from teaching a subject they do not offer', async () => {
    await request(app.getHttpServer())
      .post('/tutorlink/booking')
      .set('Authorization', `Bearer ${tutorToken}`)
      .send({ tutorProfileId: tutorId, subjectId: calculoId, ...hoursFromNow(40) })
      .expect(403);

    await request(app.getHttpServer())
      .post('/tutorlink/booking')
      .set('Authorization', `Bearer ${anaToken}`)
      .send({ tutorProfileId: tutorId, subjectId: programacionId, ...hoursFromNow(40) })
      .expect(400);
  });

  it('books a session and rejects a second one on the same slot', async () => {
    const created = await request(app.getHttpServer())
      .post('/tutorlink/booking')
      .set('Authorization', `Bearer ${anaToken}`)
      .send({ tutorProfileId: tutorId, subjectId: calculoId, ...hoursFromNow(48) })
      .expect(201);
    bookingId = created.body.id;
    expect(created.body.status).toBe('PENDING');

    await request(app.getHttpServer())
      .post('/tutorlink/booking')
      .set('Authorization', `Bearer ${anaToken}`)
      .send({ tutorProfileId: tutorId, subjectId: calculoId, ...hoursFromNow(48) })
      .expect(409);

    await request(app.getHttpServer())
      .post('/tutorlink/booking')
      .send({ tutorProfileId: tutorId, subjectId: calculoId, ...hoursFromNow(60) })
      .expect(401);
  });

  it('only the owning tutor can confirm, and a review is refused until the session is completed', async () => {
    await request(app.getHttpServer())
      .patch(`/tutorlink/booking/${bookingId}/confirm`)
      .set('Authorization', `Bearer ${anaToken}`)
      .expect(403);

    const confirmed = await request(app.getHttpServer())
      .patch(`/tutorlink/booking/${bookingId}/confirm`)
      .set('Authorization', `Bearer ${tutorToken}`)
      .expect(200);
    expect(confirmed.body.status).toBe('CONFIRMED');

    await request(app.getHttpServer())
      .post('/tutorlink/review')
      .set('Authorization', `Bearer ${anaToken}`)
      .send({ bookingId, rating: 5, comment: 'Todavía no termina la sesión.' })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/tutorlink/booking/${bookingId}/complete`)
      .set('Authorization', `Bearer ${anaToken}`)
      .expect(403);
  });

  it('lets the student review only their own completed booking, once', async () => {
    const completed = await request(app.getHttpServer())
      .patch(`/tutorlink/booking/${bookingId}/complete`)
      .set('Authorization', `Bearer ${tutorToken}`)
      .expect(200);
    expect(completed.body.status).toBe('COMPLETED');

    await request(app.getHttpServer())
      .post('/tutorlink/review')
      .set('Authorization', `Bearer ${tutorToken}`)
      .send({ bookingId, rating: 5, comment: 'El tutor no reseña.' })
      .expect(403);

    await request(app.getHttpServer())
      .post('/tutorlink/review')
      .set('Authorization', `Bearer ${luisToken}`)
      .send({ bookingId, rating: 4, comment: 'No es mi reserva.' })
      .expect(403);

    await request(app.getHttpServer())
      .post('/tutorlink/review')
      .set('Authorization', `Bearer ${anaToken}`)
      .send({ bookingId, rating: 9, comment: 'Nota fuera de rango.' })
      .expect(400);

    const review = await request(app.getHttpServer())
      .post('/tutorlink/review')
      .set('Authorization', `Bearer ${anaToken}`)
      .send({ bookingId, rating: 5, comment: '  Explica el parcial con ejercicios de ICESI.  ' })
      .expect(201);
    expect(review.body.rating).toBe(5);
    expect(review.body.comment).toBe('Explica el parcial con ejercicios de ICESI.');

    await request(app.getHttpServer())
      .post('/tutorlink/review')
      .set('Authorization', `Bearer ${anaToken}`)
      .send({ bookingId, rating: 4, comment: 'Segunda reseña.' })
      .expect(409);
  });

  it('publishes the tutor average only to an authenticated student', async () => {
    await request(app.getHttpServer()).get(`/tutorlink/review/tutor/${tutorId}`).expect(401);

    const list = await request(app.getHttpServer())
      .get(`/tutorlink/review/tutor/${tutorId}`)
      .set('Authorization', `Bearer ${luisToken}`)
      .expect(200);

    expect(list.body.count).toBe(1);
    expect(list.body.average).toBe(5);
    expect(list.body.reviews[0].comment).toContain('ICESI');
  });

  it('cancels a later session and refuses to cancel one that already finished', async () => {
    const second = await request(app.getHttpServer())
      .post('/tutorlink/booking')
      .set('Authorization', `Bearer ${anaToken}`)
      .send({ tutorProfileId: tutorId, subjectId: calculoId, ...hoursFromNow(72) })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/tutorlink/booking/${second.body.id}/complete`)
      .set('Authorization', `Bearer ${tutorToken}`)
      .expect(400);

    const cancelled = await request(app.getHttpServer())
      .patch(`/tutorlink/booking/${second.body.id}/cancel`)
      .set('Authorization', `Bearer ${tutorToken}`)
      .expect(200);
    expect(cancelled.body.status).toBe('CANCELLED');

    await request(app.getHttpServer())
      .patch(`/tutorlink/booking/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${anaToken}`)
      .expect(400);

    const mine = await request(app.getHttpServer())
      .get('/tutorlink/booking/mine?status=COMPLETED&limit=10&skip=0')
      .set('Authorization', `Bearer ${anaToken}`)
      .expect(200);
    expect(mine.body.map((booking: { id: string }) => booking.id)).toContain(bookingId);

    await request(app.getHttpServer())
      .get('/tutorlink/user')
      .set('Authorization', `Bearer ${anaToken}`)
      .expect(403);
  });
});
