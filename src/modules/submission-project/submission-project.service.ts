import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateSubmissionProjectDto } from './dto/create-submission-project.dto.js';

@Injectable()
export class SubmissionProjectService {
  constructor(private readonly prisma: PrismaService) {}

  async getSubmission(teamId: string, userId: string) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, deleted_at: null },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { id: userId },
          { wallet_address: { equals: userId, mode: 'insensitive' } },
        ],
      },
    });

    const effectiveUserId = user ? user.id : userId;

    const memberRole = await this.prisma.teamRole.findFirst({
      where: {
        team_id: team.id,
        user_id: effectiveUserId,
        deleted_at: null,
      },
    });

    const isLeader =
      team.user_id.toLowerCase() === effectiveUserId.toLowerCase();

    if (!memberRole && !isLeader) {
      throw new ForbiddenException(
        'Forbidden: Only registered team members or team leader can view project submission',
      );
    }

    const submission = await this.prisma.submissionProject.findFirst({
      where: { team_id: team.id, deleted_at: null },
    });

    if (!submission) {
      throw new NotFoundException('Project submission not found');
    }

    return {
      data: submission,
      message: 'Project submission retrieved successfully',
      errors: null,
    };
  }

  async createSubmission(
    teamId: string,
    userId: string,
    dto: CreateSubmissionProjectDto,
  ) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, deleted_at: null },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { id: userId },
          { wallet_address: { equals: userId, mode: 'insensitive' } },
        ],
      },
    });

    const effectiveUserId = user ? user.id : userId;

    const memberRole = await this.prisma.teamRole.findFirst({
      where: {
        team_id: team.id,
        user_id: effectiveUserId,
        deleted_at: null,
      },
    });

    const isLeader =
      team.user_id.toLowerCase() === effectiveUserId.toLowerCase();

    if (!memberRole && !isLeader) {
      throw new ForbiddenException(
        'Forbidden: Only registered team members or team leader can submit project',
      );
    }

    const existingSubmission = await this.prisma.submissionProject.findFirst({
      where: { team_id: team.id, deleted_at: null },
    });

    let submission;
    if (existingSubmission) {
      submission = await this.prisma.submissionProject.update({
        where: { id: existingSubmission.id },
        data: {
          title: dto.title,
          description: dto.description ?? null,
          submission_link: dto.submission_link,
          document_cid: dto.document_cid,
        },
      });
    } else {
      submission = await this.prisma.submissionProject.create({
        data: {
          title: dto.title,
          description: dto.description ?? null,
          submission_link: dto.submission_link,
          document_cid: dto.document_cid,
          team_id: team.id,
        },
      });
    }

    return {
      data: submission,
      message: 'Project submission created successfully',
      errors: null,
    };
  }
}
