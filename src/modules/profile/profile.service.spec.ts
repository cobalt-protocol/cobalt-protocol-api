import { ProfileService } from './profile.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

describe('ProfileService privacy', () => {
  const row = {
    id: 'user-b',
    username: 'builder_b',
    email: 'private@example.com',
    wallet_address: '0xabc',
    location: 'Jakarta',
    institution: 'Campus',
    skill_description: { description: 'Builder' },
    skill: { skill_name: 'Rust', level: 'ADVANCED' },
  };
  const prisma = {
    user: { findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  };
  const service = new ProfileService(prisma as unknown as PrismaService);
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.user.findFirst.mockResolvedValue(row);
    prisma.user.findMany.mockResolvedValue([row]);
    prisma.user.count.mockResolvedValue(1);
  });

  it('returns only display fields for other users', async () => {
    expect(await service.findPublic('builder_b')).toEqual({
      id: 'user-b',
      username: 'builder_b',
      location: 'Jakarta',
      institution: 'Campus',
      pitch: 'Builder',
      skills: [{ name: 'Rust', level: 'Proficient' }],
    });
    expect(prisma.user.findFirst.mock.calls[0][0].select.email).toBeUndefined();
    expect(
      prisma.user.findFirst.mock.calls[0][0].select.wallet_address,
    ).toBeUndefined();
  });

  it('keeps private fields on the own-profile route only', async () => {
    const mine = await service.findMine('user-a');
    expect(prisma.user.findFirst.mock.calls[0][0].where.id).toBe('user-a');
    expect(mine.email).toBe('private@example.com');
    expect(mine.walletAddress).toBe('0xabc');
    const directory = await service.findAll({ page: 1, limit: 10 });
    expect(directory.data[0]).not.toHaveProperty('email');
    expect(directory.data[0]).not.toHaveProperty('walletAddress');
  });
});
