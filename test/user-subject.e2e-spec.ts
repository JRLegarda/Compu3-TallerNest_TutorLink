import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from './../src/app.module.js';

// Cubre los flujos de las carpetas User y Subject de postman/TutorLink.postman_collection.json.
// Necesita PostgreSQL arriba y el .env del README.
// Se ejecuta con: RUN_E2E=true npm run test:e2e
const enabled = process.env.RUN_E2E === 'true';

describe.skipIf(!enabled)('User + Subject (e2e)', () => {
  let app: INestApplication;

  const seedKey = process.env.SEED_KEY ?? '';
  const stamp = Date.now();
  const email = `nuevo${stamp}@example.com`;
  const password = 'Secreta123';

  let token = '';
  let userId = '';
  let adminToken = '';
  let adminId = '';
  let subjectId = '';

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

  it('runs the seed', async () => {
    const res = await request(app.getHttpServer())
      .get(`/tutorlink/seed?key=${seedKey}`)
      .expect(200);
    expect(res.body.message).toBe('SEED EXECUTED');
  });

  it('registers a student and rejects a duplicated email', async () => {
    const res = await request(app.getHttpServer())
      .post('/tutorlink/user/signup')
      .send({ email, password, fullName: 'Estudiante Nuevo' })
      .expect(201);

    token = res.body.token;
    userId = res.body.id;
    expect(res.body.roles).toEqual(['student']);
    expect(res.body.password).toBeUndefined();

    await request(app.getHttpServer())
      .post('/tutorlink/user/signup')
      .send({ email, password, fullName: 'Estudiante Nuevo' })
      .expect(409);
  });

  it('logs in and rejects a wrong password', async () => {
    const res = await request(app.getHttpServer())
      .post('/tutorlink/user/auth')
      .send({ email, password })
      .expect(201);

    token = res.body.token;
    expect(token).toBeTruthy();

    await request(app.getHttpServer())
      .post('/tutorlink/user/auth')
      .send({ email, password: 'OtraClave1' })
      .expect(401);
  });

  it('returns the profile and then invalidates the token on logout', async () => {
    const me = await request(app.getHttpServer())
      .get('/tutorlink/user/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(me.body.email).toBe(email);

    await request(app.getHttpServer())
      .post('/tutorlink/user/logout')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    await request(app.getHttpServer())
      .get('/tutorlink/user/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });

  it('forbids a student from listing users', async () => {
    const login = await request(app.getHttpServer())
      .post('/tutorlink/user/auth')
      .send({ email, password })
      .expect(201);
    token = login.body.token;

    await request(app.getHttpServer())
      .get('/tutorlink/user?limit=10&skip=0')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('lets an admin list, find, change roles and deactivate', async () => {
    const login = await request(app.getHttpServer())
      .post('/tutorlink/user/auth')
      .send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })
      .expect(201);
    adminToken = login.body.token;
    adminId = login.body.id;

    const list = await request(app.getHttpServer())
      .get('/tutorlink/user?limit=10&skip=0')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(list.body.map((user: { id: string }) => user.id)).toContain(userId);

    const one = await request(app.getHttpServer())
      .get(`/tutorlink/user/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(one.body.email).toBe(email);

    const roles = await request(app.getHttpServer())
      .patch(`/tutorlink/user/${userId}/roles`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ roles: ['tutor'] })
      .expect(200);
    expect(roles.body.roles).toEqual(['tutor']);

    await request(app.getHttpServer())
      .delete(`/tutorlink/user/${adminId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);

    const deactivated = await request(app.getHttpServer())
      .delete(`/tutorlink/user/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(deactivated.body.message).toContain(email);

    await request(app.getHttpServer())
      .post('/tutorlink/user/auth')
      .send({ email, password })
      .expect(401);
  });

  it('admin creates a subject and duplicates fail', async () => {
    const res = await request(app.getHttpServer())
      .post('/tutorlink/subject')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Materia ${stamp}`, university: 'ICESI', semester: '3' })
      .expect(201);

    subjectId = res.body.id;

    await request(app.getHttpServer())
      .post('/tutorlink/subject')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Materia ${stamp}`, university: 'ICESI', semester: '3' })
      .expect(409);
  });

  it('an authenticated user lists and reads subjects', async () => {
    const login = await request(app.getHttpServer())
      .post('/tutorlink/user/auth')
      .send({ email: 'ana@example.com', password: 'Secreta123' })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get(`/tutorlink/subject?university=ICESI&semester=3&search=Materia&limit=10&skip=0`)
      .set('Authorization', `Bearer ${login.body.token}`)
      .expect(200);
    expect(list.body.map((subject: { id: string }) => subject.id)).toContain(subjectId);

    const one = await request(app.getHttpServer())
      .get(`/tutorlink/subject/${subjectId}`)
      .set('Authorization', `Bearer ${login.body.token}`)
      .expect(200);
    expect(one.body.university).toBe('ICESI');

    await request(app.getHttpServer())
      .post('/tutorlink/subject')
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({ name: 'No puedo', university: 'ICESI', semester: '1' })
      .expect(403);
  });

  it('admin updates and deletes a subject', async () => {
    const updated = await request(app.getHttpServer())
      .patch(`/tutorlink/subject/${subjectId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Materia editada ${stamp}` })
      .expect(200);
    expect(updated.body.name).toBe(`Materia editada ${stamp}`);

    await request(app.getHttpServer())
      .delete(`/tutorlink/subject/${subjectId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/tutorlink/subject/${subjectId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('rejects subject listing without a token', async () => {
    await request(app.getHttpServer()).get('/tutorlink/subject').expect(401);
  });
});
