import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, randomUUID } from 'node:crypto';
import { verifyMessage } from 'viem';
import { User } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RequestNonceDto } from './dto/request-nonce.dto.js';
import { VerifySignatureDto } from './dto/verify-signature.dto.js';

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
  user: User;
}

export interface VerifySignatureResponse {
  data: VerifySignatureData;
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

  async generateNonce(dto?: RequestNonceDto): Promise<NonceResponse> {
    const nonce = randomBytes(16).toString('hex');
    const walletAddress = dto?.walletAddress
      ? dto.walletAddress.toLowerCase()
      : undefined;

    let user: User | null = null;

    if (walletAddress) {
      try {
        user = await this.prisma.user.findUnique({
          where: { wallet_address: walletAddress },
        });

        if (!user) {
          user = await this.prisma.user.create({
            data: {
              id: randomUUID(),
              wallet_address: walletAddress,
            },
          });
        }

        await this.prisma.nonceConnect.upsert({
          where: { user_id: user.id },
          create: {
            id: randomUUID(),
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
          id: randomUUID(),
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
      this.logger.warn(
        `Could not query database for stored nonce: ${dbError}`,
      );
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
      user = await this.prisma.user.findUnique({
        where: { wallet_address: walletAddress },
      });
      if (!user) {
        user = await this.prisma.user.create({
          data: {
            id: randomUUID(),
            wallet_address: walletAddress,
          },
        });
      }
      await this.prisma.nonceConnect.deleteMany({
        where: { user_id: user.id },
      });
    } catch (dbError) {
      this.logger.warn(
        `Could not sync user or clear nonce from database: ${dbError}`,
      );
      user = {
        id: randomUUID(),
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

    const payload = {
      sub: user?.id || randomUUID(),
      wallet_address: walletAddress,
    };
    const token = this.jwtService.sign(payload);

    return {
      data: {
        token,
        user: user!,
      },
      message: 'Signature verified successfully',
      errors: null,
    };
  }
}







