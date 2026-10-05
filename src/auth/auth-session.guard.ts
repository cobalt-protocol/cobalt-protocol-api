import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  userId: string;
}

export interface OptionalAuthenticatedRequest extends Request {
  userId?: string;
}

@Injectable()
export class AuthSessionGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const match = /^Bearer\s+(.+)$/i.exec(request.headers.authorization ?? '');

    if (!match) {
      throw new UnauthorizedException('A valid session is required');
    }

    try {
      const payload = await this.jwtService.verifyAsync(match[1]);
      if (!payload?.sub) {
        throw new UnauthorizedException('Session is invalid or expired');
      }
      request.userId = payload.sub;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Session is invalid or expired');
    }
  }
}

@Injectable()
export class OptionalAuthSessionGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<OptionalAuthenticatedRequest>();
    const match = /^Bearer\s+(.+)$/i.exec(request.headers.authorization ?? '');

    if (!match) {
      return true;
    }

    try {
      const payload = await this.jwtService.verifyAsync(match[1]);
      if (payload?.sub) {
        request.userId = payload.sub;
      }
    } catch {
      // Optional guard ignores invalid tokens and proceeds unauthenticated
    }

    return true;
  }
}
