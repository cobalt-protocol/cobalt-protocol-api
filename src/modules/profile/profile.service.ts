import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';

const publicSelect = {
  id: true,
  username: true,
  location: true,
  institution: true,
  skill_description: { select: { description: true } },
  social_media: { select: { github_link: true, linkedin_link: true } },
  skills: { select: { skill_name: true } },
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
    skills: user.skills
      ? user.skills.map((s) => ({
          name: s.skill_name,
          level: 'Proficient' as const,
        }))
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

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

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

    // PAYLOAD RULE: description/pitch HANYA ke skillDescriptionUser (tabel skill_description_user),
    // JANGAN pernah insert ke skills_user. skills[] HANYA ke skills_user (SkillUser).
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
              ...(dto.email !== undefined && {
                email: dto.email.toLowerCase(),
              }),
              ...(dto.location !== undefined && { location: dto.location }),
              ...(dto.institution !== undefined && {
                institution: dto.institution,
              }),
            },
          });
        }

        if (description !== undefined) {
          await tx.skillDescriptionUser.upsert({
            where: { user_id: userId },
            create: { user_id: userId, description },
            update: { description },
          });
        }

        if (githubLink !== undefined || linkedinLink !== undefined) {
          const currentSocial = await tx.socialMediaUser.findUnique({
            where: { user_id: userId },
          });
          if (currentSocial) {
            await tx.socialMediaUser.update({
              where: { user_id: userId },
              data: {
                ...(githubLink !== undefined && { github_link: githubLink }),
                ...(linkedinLink !== undefined && {
                  linkedin_link: linkedinLink,
                }),
              },
            });
          } else {
            await tx.socialMediaUser.create({
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
          await tx.skillUser.deleteMany({ where: { user_id: userId } });
          if (names.length > 0) {
            await tx.skillUser.createMany({
              data: names.map((skill_name) => ({
                user_id: userId,
                skill_name,
              })),
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
