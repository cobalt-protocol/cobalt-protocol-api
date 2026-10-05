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
    social_media: {
      github_link: 'https://github.com/builder_b',
      linkedin_link: 'https://linkedin.com/in/builder_b',
    },
    skills: [{ skill_name: 'Rust', level: 'ADVANCED' }],
  };
  const userUpdate = vi.fn();
  const skillDescriptionUpsert = vi.fn();
  const socialMediaFindUnique = vi.fn();
  const socialMediaUpdate = vi.fn();
  const socialMediaCreate = vi.fn();
  const skillUpsert = vi.fn();
  const skillDeleteMany = vi.fn();

  const prisma = {
    user: { findFirst: vi.fn(), update: userUpdate },
    skillDescriptionUser: { upsert: skillDescriptionUpsert },
    socialMediaUser: {
      findUnique: socialMediaFindUnique,
      update: socialMediaUpdate,
      create: socialMediaCreate,
    },
    skillUser: {
      upsert: skillUpsert,
      deleteMany: skillDeleteMany,
      createMany: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(prisma)),
  };
  const service = new ProfileService(prisma as unknown as PrismaService);
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.user.findFirst.mockResolvedValue(row);
    socialMediaFindUnique.mockResolvedValue(null);
  });

  it('keeps private fields on the own-profile route only', async () => {
    const mine = await service.findMine('user-a');
    expect(prisma.user.findFirst.mock.calls[0][0].where.id).toBe('user-a');
    expect(mine.email).toBe('private@example.com');
    expect(mine.walletAddress).toBe('0xabc');
  });

  it('updates profile fields on user, social_media, and skill_description tables', async () => {
    await service.updateMine('user-b', {
      username: 'new_name',
      email: 'new@example.com',
      location: 'Bandung',
      institution: 'ITB',
      description: 'Updated bio',
      github_link: 'https://github.com/new_name',
      linkedin_link: 'https://linkedin.com/in/new_name',
    });

    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 'user-b' },
      data: {
        username: 'new_name',
        email: 'new@example.com',
        location: 'Bandung',
        institution: 'ITB',
      },
    });

    expect(skillDescriptionUpsert).toHaveBeenCalledWith({
      where: { user_id: 'user-b' },
      create: { user_id: 'user-b', description: 'Updated bio' },
      update: { description: 'Updated bio' },
    });

    expect(socialMediaCreate).toHaveBeenCalledWith({
      data: {
        user_id: 'user-b',
        github_link: 'https://github.com/new_name',
        linkedin_link: 'https://linkedin.com/in/new_name',
      },
    });
  });
});
