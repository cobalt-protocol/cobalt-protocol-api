import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import { verifyMessage } from 'viem';
import { User } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { generateUlid } from '../common/utils/ulid.util.js';
import { RequestNonceDto } from './dto/request-nonce.dto.js';
import { VerifySignatureDto } from './dto/verify-signature.dto.js';

export type UserRole = 'organization' | 'user';

export type UserWithRole = User & {
  role: UserRole;
};

export interface NonceData {
  nonce: string;
  user?: User;
}

export interface NonceResponse {
  data: NonceData;
  message: string;
  errors: null;
}

export interface VerifySignatureData {
  token: string;
  user: UserWithRole;
}

export interface VerifySignatureResponse {
  data: VerifySignatureData;
  message: string;
  errors: null;
}

export interface UserProfileData {
  user: UserWithRole;
}

export interface UserProfileResponse {
  data: UserProfileData;
  message: string;
  errors: null;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private async getUserRole(userId: string): Promise<UserRole> {
    try {
      const org = await this.prisma.organization.findFirst({
        where: { user_id: userId },
        select: { id: true },
      });
      return org ? 'organization' : 'user';
    } catch (dbError) {
      this.logger.warn(
        `Could not query database for organization relation: ${dbError}`,
      );
      return 'user';
    }
  }

  async generateNonce(dto?: RequestNonceDto): Promise<NonceResponse> {
    const nonce = randomBytes(16).toString('hex');
    const walletAddress = dto?.walletAddress
      ? dto.walletAddress.toLowerCase()
      : undefined;

    let user: User | null = null;

    if (walletAddress) {
      try {
        user = await this.prisma.user.upsert({
          where: { wallet_address: walletAddress },
          create: {
            id: generateUlid(),
            wallet_address: walletAddress,
          },
          update: {},
        });

        await this.prisma.nonceConnect.upsert({
          where: { user_id: user.id },
          create: {
            id: generateUlid(),
            nonce,
            user_id: user.id,
          },
          update: {
            nonce,
          },
        });
      } catch (dbError) {
        this.logger.warn(`Could not persist nonce to database: ${dbError}`);
        user = {
          id: generateUlid(),
          wallet_address: walletAddress,
          username: null,
          email: null,
          location: null,
          institution: null,
          created_at: new Date(),
          updated_at: null,
          deleted_at: null,
        };
      }
    }

    return {
      data: {
        nonce,
        ...(user && { user }),
      },
      message: 'Nonce generated successfully',
      errors: null,
    };
  }

  async verifySignature(
    dto: VerifySignatureDto,
  ): Promise<VerifySignatureResponse> {
    const walletAddress = dto.walletAddress.toLowerCase();
    let messageToVerify = dto.message;
    let storedNonce: string | undefined = dto.nonce;

    try {
      const user = await this.prisma.user.findUnique({
        where: { wallet_address: walletAddress },
        include: { nonce_connect: true },
      });
      if (user?.nonce_connect?.nonce) {
        storedNonce = user.nonce_connect.nonce;
      }
    } catch (dbError) {
      this.logger.warn(`Could not query database for stored nonce: ${dbError}`);
    }

    if (!messageToVerify) {
      if (storedNonce) {
        messageToVerify = `Sign this message to authenticate with Cobalt Protocol.\n\nWallet: ${walletAddress}\nNonce: ${storedNonce}`;
      } else {
        messageToVerify = `Sign this message to authenticate with Cobalt Protocol.\n\nNonce: ${dto.nonce || ''}`;
      }
    }

    let isValid = false;
    try {
      isValid = await verifyMessage({
        address: walletAddress as `0x${string}`,
        message: messageToVerify,
        signature: dto.signature as `0x${string}`,
      });
    } catch (err) {
      this.logger.warn(
        `Signature verification failed with primary message format: ${err}`,
      );
    }

    if (!isValid && dto.nonce) {
      try {
        const altMessage = `Sign this message to authenticate with Cobalt Protocol.\n\nNonce: ${dto.nonce}`;
        isValid = await verifyMessage({
          address: walletAddress as `0x${string}`,
          message: altMessage,
          signature: dto.signature as `0x${string}`,
        });
      } catch {
        // ignore
      }
    }

    if (!isValid) {
      throw new BadRequestException(
        'Invalid cryptographic signature for wallet address',
      );
    }

    let user: User | null = null;
    try {
      user = await this.prisma.user.upsert({
        where: { wallet_address: walletAddress },
        create: {
          id: generateUlid(),
          wallet_address: walletAddress,
        },
        update: {},
      });
      await this.prisma.nonceConnect.deleteMany({
        where: { user_id: user.id },
      });
    } catch (dbError) {
      this.logger.warn(
        `Could not sync user or clear nonce from database: ${dbError}`,
      );
      user = {
        id: generateUlid(),
        wallet_address: walletAddress,
        username: null,
        email: null,
        location: null,
        institution: null,
        created_at: new Date(),
        updated_at: null,
        deleted_at: null,
      };
    }

    const role = await this.getUserRole(user.id);

    const payload = {
      sub: user.id,
      wallet_address: walletAddress,
    };
    const token = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.authSession.upsert({
      where: { token_hash: tokenHash },
      create: {
        id: generateUlid(),
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
      },
      update: {
        user_id: user.id,
        expires_at: expiresAt,
        revoked_at: null,
      },
    });

    return {
      data: {
        token,
        user: {
          ...user,
          role,
        },
      },
      message: 'Signature verified successfully',
      errors: null,
    };
  }

  async getMe(authHeader?: string): Promise<UserProfileResponse> {
    if (!authHeader) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const userId = payload.sub;
    const walletAddress = payload.wallet_address;

    let user: User | null = null;
    try {
      if (userId) {
        user = await this.prisma.user.findUnique({
          where: { id: userId },
        });
      }
      if (!user && walletAddress) {
        user = await this.prisma.user.findUnique({
          where: { wallet_address: walletAddress.toLowerCase() },
        });
      }
    } catch (dbError) {
      this.logger.warn(`Could not query database for user: ${dbError}`);
    }

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const role = await this.getUserRole(user.id);

    return {
      data: {
        user: {
          ...user,
          role,
        },
      },
      message: 'User profile retrieved successfully',
      errors: null,
    };
  }
}
