import { createHash } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';

export interface AuthenticatedRequest extends Request {
  userId: string;
}

export interface OptionalAuthenticatedRequest extends Request {
  userId?: string;
}

@Injectable()
export class AuthSessionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const match = /^Bearer\s+(.+)$/i.exec(
      request.headers.authorization ?? '',
    );

    if (!match) {
      throw new UnauthorizedException('A valid session is required');
    }

    const tokenHash = createHash('sha256').update(match[1]).digest('hex');
    const session = await this.prisma.authSession.findUnique({
      where: { token_hash: tokenHash },
      include: { user: { select: { id: true, deleted_at: true } } },
    });

    if (
      !session ||
      session.revoked_at ||
      session.expires_at <= new Date() ||
      session.user.deleted_at
    ) {
      throw new UnauthorizedException('Session is invalid or expired');
    }

    request.userId = session.user.id;
    return true;
  }
}

@Injectable()
export class OptionalAuthSessionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<OptionalAuthenticatedRequest>();
    const match = /^Bearer\s+(.+)$/i.exec(
      request.headers.authorization ?? '',
    );

    if (!match) {
      return true;
    }

    const tokenHash = createHash('sha256').update(match[1]).digest('hex');
    const session = await this.prisma.authSession.findUnique({
      where: { token_hash: tokenHash },
      include: { user: { select: { id: true, deleted_at: true } } },
    });

    if (
      session &&
      !session.revoked_at &&
      session.expires_at > new Date() &&
      !session.user.deleted_at
    ) {
      request.userId = session.user.id;
    }

    return true;
  }
}
