import { ValidationPipe, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';

describe('AuthController & ChainAuthController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        stopAtFirstError: true,
      }),
    );
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  describe('/api/v1/auth', () => {
    it('POST /auth/nonce - success', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/nonce')
        .send({ walletAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' })
        .expect(201);

      expect(response.body).toMatchObject({
        data: {
          user: {
            wallet_address: expect.any(String),
          },
        },
        message: 'Nonce generated successfully',
        errors: null,
      });
      expect(response.body.data.nonce).toEqual(expect.any(String));
    });

    it('POST /auth/nonce - validation error', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/nonce')
        .send({ walletAddress: 'invalid-address' })
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: expect.arrayContaining([
            'walletAddress must be an Ethereum address',
          ]),
        },
      });
    });

    it('GET /auth/me - missing header returns 401', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body).toMatchObject({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing authorization header',
        },
      });
    });

    it('GET /auth/me - with If-None-Match header does not return 304', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('If-None-Match', '"some-etag-value"')
        .expect(401);

      expect(response.status).not.toBe(304);
      expect(response.headers['cache-control']).toContain('no-store');
      expect(response.headers['cache-control']).toContain('no-cache');
      expect(response.headers['pragma']).toBe('no-cache');
    });
  });

  describe('/api/v1/chains/:chain_id/auth', () => {
    it('POST /chains/968/auth/nonce - success', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/chains/968/auth/nonce')
        .send({ walletAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' })
        .expect(201);

      expect(response.body).toMatchObject({
        data: {
          user: {
            wallet_address: expect.any(String),
          },
        },
        message: 'Nonce generated successfully',
        errors: null,
      });
      expect(response.body.data.nonce).toEqual(expect.any(String));
    });

    it('GET /chains/968/auth/me - missing header returns 401', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/chains/968/auth/me')
        .expect(401);

      expect(response.body).toMatchObject({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing authorization header',
        },
      });
    });
  });

  describe('/api/v1/chains/:chain_id/profiles', () => {
    it('GET /chains/968/profiles/me - missing header returns 401', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/chains/968/profiles/me')
        .expect(401);

      expect(response.body).toMatchObject({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing authorization header',
        },
      });
    });

    it('PATCH /chains/968/profiles/me - missing header returns 401', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/chains/968/profiles/me')
        .send({ username: 'newname' })
        .expect(401);

      expect(response.body).toMatchObject({
        error: {
          code: 'UNAUTHORIZED',
          message: 'A valid session is required',
        },
      });
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
