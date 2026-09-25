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
    social_media: { github_link: 'https://github.com/builder_b', linkedin_link: 'https://linkedin.com/in/builder_b' },
    skill: { skill_name: 'Rust', level: 'ADVANCED' },
  };
  const userUpdate = vi.fn();
  const skillDescriptionUpsert = vi.fn();
  const socialMediaFindUnique = vi.fn();
  const socialMediaUpdate = vi.fn();
  const socialMediaCreate = vi.fn();
  const skillUpsert = vi.fn();
  const skillDeleteMany = vi.fn();

  const prisma = {
    user: { findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn(), update: userUpdate },
    skillDescription: { upsert: skillDescriptionUpsert },
    socialMedia: { findUnique: socialMediaFindUnique, update: socialMediaUpdate, create: socialMediaCreate },
    skill: { upsert: skillUpsert, deleteMany: skillDeleteMany },
    $transaction: vi.fn((cb) => cb(prisma)),
  };
  const service = new ProfileService(prisma as unknown as PrismaService);
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.user.findFirst.mockResolvedValue(row);
    prisma.user.findMany.mockResolvedValue([row]);
    prisma.user.count.mockResolvedValue(1);
    socialMediaFindUnique.mockResolvedValue(null);
  });

  it('returns display fields and social media for users', async () => {
    expect(await service.findPublic('builder_b')).toEqual({
      id: 'user-b',
      username: 'builder_b',
      location: 'Jakarta',
      institution: 'Campus',
      pitch: 'Builder',
      description: 'Builder',
      social_media: {
        github_link: 'https://github.com/builder_b',
        linkedin_link: 'https://linkedin.com/in/builder_b',
      },
      github_link: 'https://github.com/builder_b',
      linkedin_link: 'https://linkedin.com/in/builder_b',
      githubLink: 'https://github.com/builder_b',
      linkedinLink: 'https://linkedin.com/in/builder_b',
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
