import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SkillLevel } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { ProfileQueryDto } from './dto/profile-query.dto.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';
import type { ProfileSkillLevel } from './dto/profile-skill.dto.js';

const publicSelect = {
  id: true,
  username: true,
  location: true,
  institution: true,
  skill_description: { select: { description: true } },
  skills: { select: { skill_name: true, level: true } },
} satisfies Prisma.UserSelect;
const privateSelect = {
  ...publicSelect,
  email: true,
  wallet_address: true,
} satisfies Prisma.UserSelect;
type PublicProfile = Prisma.UserGetPayload<{ select: typeof publicSelect }>;
type PrivateProfile = Prisma.UserGetPayload<{ select: typeof privateSelect }>;
const fromDbLevel: Record<SkillLevel, ProfileSkillLevel> = {
  INTERMEDIATE: 'Intermediate',
  PROFICIENT: 'Proficient',
  ADVANCED: 'Advanced',
  EXPERT: 'Expert',
};
function presentPublic(user: PublicProfile) {
  return {
    id: user.id,
    username: user.username,
    location: user.location,
    institution: user.institution,
    pitch: user.skill_description?.description ?? '',
    skills: user.skills.map((skill) => ({
      name: skill.skill_name,
      level: fromDbLevel[skill.level],
    })),
  };
}
function presentPrivate(user: PrivateProfile) {
  return {
    ...presentPublic(user),
    email: user.email,
    walletAddress: user.wallet_address,
  };
}

const toDbLevel: Record<ProfileSkillLevel, SkillLevel> = {
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
                skills: {
                  some: {
                    skill_name: { contains: search, mode: 'insensitive' },
                  },
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
    try {
      await this.prisma.$transaction(async (tx) => {
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
        if (dto.pitch !== undefined) {
          await tx.skillDescription.upsert({
            where: { user_id: userId },
            create: { user_id: userId, description: dto.pitch },
            update: { description: dto.pitch },
          });
        }
        if (dto.skills !== undefined) {
          await tx.skill.deleteMany({ where: { user_id: userId } });
          if (dto.skills.length)
            await tx.skill.createMany({
              data: dto.skills.map((skill) => ({
                user_id: userId,
                skill_name: skill.name.trim(),
                level: toDbLevel[skill.level],
              })),
            });
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
