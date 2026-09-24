import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SkillLevel } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { ProfileQueryDto } from './dto/profile-query.dto.js';
import type { ProfileSkillLevel } from './dto/profile-skill.dto.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';

const publicSelect = {
  id: true,
  username: true,
  location: true,
  institution: true,
  skill_description: { select: { description: true } },
  social_media: { select: { github_link: true, linkedin_link: true } },
  skill: { select: { skill_name: true } },
} satisfies Prisma.UserSelect;
const privateSelect = {
  ...publicSelect,
  email: true,
  wallet_address: true,
} satisfies Prisma.UserSelect;
type PublicProfile = Prisma.UserGetPayload<{ select: typeof publicSelect }>;
type PrivateProfile = Prisma.UserGetPayload<{ select: typeof privateSelect }>;

function presentPublic(user: PublicProfile) {
  return {
    id: user.id,
    username: user.username,
    location: user.location,
    institution: user.institution,
    pitch: user.skill_description?.description ?? '',
    description: user.skill_description?.description ?? '',
    social_media: user.social_media
      ? {
          github_link: user.social_media.github_link,
          linkedin_link: user.social_media.linkedin_link,
        }
      : null,
    github_link: user.social_media?.github_link ?? null,
    linkedin_link: user.social_media?.linkedin_link ?? null,
    githubLink: user.social_media?.github_link ?? null,
    linkedinLink: user.social_media?.linkedin_link ?? null,
    skills: user.skill
      ? [{ name: user.skill.skill_name, level: 'Proficient' as const }]
      : [],
  };
}
function presentPrivate(user: PrivateProfile) {
  return {
    ...presentPublic(user),
    email: user.email,
    walletAddress: user.wallet_address,
  };
}

const _toDbLevel: Record<ProfileSkillLevel, SkillLevel> = {
  Intermediate: SkillLevel.INTERMEDIATE,
  Proficient: SkillLevel.PROFICIENT,
  Advanced: SkillLevel.ADVANCED,
  Expert: SkillLevel.EXPERT,
};

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ProfileQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 50);
    const search = query.search?.trim();
    const where: Prisma.UserWhereInput = {
      deleted_at: null,
      username: { not: null },
      ...(search
        ? {
            OR: [
              { username: { contains: search, mode: 'insensitive' } },
              { location: { contains: search, mode: 'insensitive' } },
              { institution: { contains: search, mode: 'insensitive' } },
              {
                skill: {
                  skill_name: { contains: search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };
    const [total, data] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: publicSelect,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
    ]);
    return {
      data: data.map(presentPublic),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findPublic(username: string) {
    const user = await this.prisma.user.findFirst({
      where: { username, deleted_at: null },
      select: publicSelect,
    });
    if (!user) throw new NotFoundException('Profile not found');
    return presentPublic(user);
  }

  async findMine(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deleted_at: null },
      select: privateSelect,
    });
    if (!user) throw new NotFoundException('Profile not found');
    return presentPrivate(user);
  }

  async updateMine(userId: string, dto: UpdateProfileDto) {
    await this.findMine(userId);
    if (dto.skills) {
      const names = dto.skills.map((skill) => skill.name.trim().toLowerCase());
      if (names.some((name) => !name) || new Set(names).size !== names.length)
        throw new ConflictException('Skill names must be unique and nonempty');
    }

    const description = dto.description ?? dto.pitch;
    const githubLink =
      dto.github_link ??
      dto.githubLink ??
      dto.social_media?.github_link ??
      dto.social_media?.githubLink ??
      dto.socialMedia?.github_link ??
      dto.socialMedia?.githubLink;

    const linkedinLink =
      dto.linkedin_link ??
      dto.linkedinLink ??
      dto.social_media?.linkedin_link ??
      dto.social_media?.linkedinLink ??
      dto.socialMedia?.linkedin_link ??
      dto.socialMedia?.linkedinLink;

    try {
      await this.prisma.$transaction(async (tx) => {
        if (
          dto.username !== undefined ||
          dto.email !== undefined ||
          dto.location !== undefined ||
          dto.institution !== undefined
        ) {
          await tx.user.update({
            where: { id: userId },
            data: {
              ...(dto.username !== undefined && { username: dto.username }),
              ...(dto.email !== undefined && { email: dto.email.toLowerCase() }),
              ...(dto.location !== undefined && { location: dto.location }),
              ...(dto.institution !== undefined && {
                institution: dto.institution,
              }),
            },
          });
        }

        if (description !== undefined) {
          await tx.skillDescription.upsert({
            where: { user_id: userId },
            create: { user_id: userId, description },
            update: { description },
          });
        }

        if (githubLink !== undefined || linkedinLink !== undefined) {
          const currentSocial = await tx.socialMedia.findUnique({
            where: { user_id: userId },
          });
          if (currentSocial) {
            await tx.socialMedia.update({
              where: { user_id: userId },
              data: {
                ...(githubLink !== undefined && { github_link: githubLink }),
                ...(linkedinLink !== undefined && { linkedin_link: linkedinLink }),
              },
            });
          } else {
            await tx.socialMedia.create({
              data: {
                user_id: userId,
                github_link: githubLink ?? '',
                linkedin_link: linkedinLink ?? '',
              },
            });
          }
        }

        if (dto.skills !== undefined) {
          const names = dto.skills
            .map((skill) => skill.name.trim())
            .filter(Boolean);
          if (!names.length) {
            await tx.skill.deleteMany({ where: { user_id: userId } });
          } else {
            const primarySkill = names[0];
            await tx.skill.upsert({
              where: { user_id: userId },
              create: { user_id: userId, skill_name: primarySkill },
              update: { skill_name: primarySkill },
            });
          }
        }
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException(
          'Username, email or skill is already in use',
        );
      throw error;
    }
    return this.findMine(userId);
  }
}
