import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { AppModule } from './../src/app.module.js';

// Humo de la app: necesita PostgreSQL arriba y el .env del README.
// Se ejecuta con: RUN_E2E=true npm run test:e2e
const enabled = process.env.RUN_E2E === 'true';

describe.skipIf(!enabled)('App (e2e)', () => {
  let app: INestApplication;

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

  it('serves the Swagger docs', async () => {
    await request(app.getHttpServer()).get('/docs').expect(200);
  });

  it('rejects protected routes without a token', async () => {
    const res = await request(app.getHttpServer()).get('/tutorlink/user/me').expect(401);
    expect(res.body.message).toBeTruthy();
  });
});
