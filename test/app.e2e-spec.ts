import { ValidationPipe, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';

describe('AppController (e2e)', () => {
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

  it('/api/v1 (GET)', () => {
    return request(app.getHttpServer()).get('/api/v1').expect(200).expect({
      data: 'Hello World!',
      message: 'Success',
      errors: null,
    });
  });

  it('/api/v1/health (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    expect(response.body).toMatchObject({
      data: {
        status: 'ok',
      },
      message: 'Success',
      errors: null,
    });
    expect(response.body.data.timestamp).toEqual(expect.any(String));
    expect(response.body.data.uptimeSeconds).toEqual(expect.any(Number));
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
            wallet_address: '0x742d35cc6634c0532925a3b844bc454e4438f44e',
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
        data: null,
        message: 'Validation failed',
        errors: expect.arrayContaining([
          'walletAddress must be an Ethereum address',
        ]),
      });
    });

    it('GET /auth/@me - missing header returns 401', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/@me')
        .expect(401);

      expect(response.body).toMatchObject({
        data: null,
        message: 'Missing authorization header',
        errors: null,
      });
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
