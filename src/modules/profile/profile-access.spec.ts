import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthSessionGuard } from '../../auth/auth-session.guard.js';
import { ProfileController } from './profile.controller.js';
import { ProfileService } from './profile.service.js';

describe('profile access boundaries', () => {
  let app: INestApplication;
  const tokenA = 'valid-jwt-token-a';
  const profiles = {
    updateMine: vi.fn(),
  };
  const mockJwtService = {
    verifyAsync: vi.fn().mockImplementation(async (token: string) => {
      if (token === tokenA) {
        return { sub: 'user-a' };
      }
      throw new Error('Invalid token');
    }),
  };

  beforeAll(async () => {
    profiles.updateMine.mockImplementation(async (id: string) => ({ id }));
    const module = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [
        AuthSessionGuard,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ProfileService, useValue: profiles },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => vi.clearAllMocks());

  it('rejects missing and unknown sessions', async () => {
    await request(app.getHttpServer())
      .patch('/profiles/me')
      .send({ username: 'builder_a' })
      .expect(401);
    await request(app.getHttpServer())
      .patch('/profiles/me')
      .set('Authorization', `Bearer ${'B'.repeat(43)}`)
      .send({ username: 'builder_a' })
      .expect(401);
  });

  it('always edits the authenticated user; identifier mutation is absent', async () => {
    await request(app.getHttpServer())
      .patch('/profiles/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ username: 'builder_a' })
      .expect(200);
    expect(profiles.updateMine).toHaveBeenCalledWith(
      'user-a',
      expect.objectContaining({ username: 'builder_a' }),
    );
  });
});
