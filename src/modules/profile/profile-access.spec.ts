import { createHash } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthSessionGuard } from '../../auth/auth-session.guard.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ProfileController } from './profile.controller.js';
import { ProfileService } from './profile.service.js';

describe('profile access boundaries', () => {
  let app: INestApplication;
  const tokenA = 'A'.repeat(43);
  const hashA = createHash('sha256').update(tokenA).digest('hex');
  const profiles = {
    findAll: vi.fn(),
    findPublic: vi.fn(),
    findMine: vi.fn(),
    updateMine: vi.fn(),
  };
  const prisma = {
    authSession: {
      findUnique: vi
        .fn()
        .mockImplementation(({ where }: { where: { token_hash: string } }) =>
          where.token_hash === hashA
            ? {
                expires_at: new Date(Date.now() + 60_000),
                revoked_at: null,
                user: { id: 'user-a', deleted_at: null },
              }
            : null,
        ),
    },
  };

  beforeAll(async () => {
    profiles.findPublic.mockResolvedValue({
      id: 'user-b',
      username: 'builder_b',
      skills: [],
    });
    profiles.findMine.mockImplementation(async (id: string) => ({
      id,
      email: 'a@example.com',
    }));
    profiles.updateMine.mockImplementation(async (id: string) => ({ id }));
    const module = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [
        AuthSessionGuard,
        { provide: PrismaService, useValue: prisma },
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

  it('does not expose private profile fields on the public route', async () => {
    const response = await request(app.getHttpServer())
      .get('/profiles/builder_b')
      .expect(200);
    expect(response.body).toEqual({
      id: 'user-b',
      username: 'builder_b',
      skills: [],
    });
    expect(response.body.email).toBeUndefined();
  });

  it('rejects missing and unknown sessions', async () => {
    await request(app.getHttpServer()).get('/profiles/me').expect(401);
    await request(app.getHttpServer())
      .get('/profiles/me')
      .set('Authorization', `Bearer ${'B'.repeat(43)}`)
      .expect(401);
  });

  it('always reads and edits the authenticated user; identifier mutation is absent', async () => {
    await request(app.getHttpServer())
      .get('/profiles/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(profiles.findMine).toHaveBeenCalledWith('user-a');
    await request(app.getHttpServer())
      .patch('/profiles/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ username: 'builder_a' })
      .expect(200);
    expect(profiles.updateMine).toHaveBeenCalledWith(
      'user-a',
      expect.objectContaining({ username: 'builder_a' }),
    );
    await request(app.getHttpServer())
      .patch('/profiles/builder_b')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ username: 'stolen' })
      .expect(404);
    expect(profiles.updateMine).toHaveBeenCalledTimes(1);
  });
});
