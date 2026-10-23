import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';
import { verifyMessage } from 'viem';
import {
  User,
  SkillDescriptionUser,
  SocialMediaUser,
  SkillUser,
  Organization,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { generateUlid } from '../common/utils/ulid.util.js';
import { RequestNonceDto } from './dto/request-nonce.dto.js';
import { VerifySignatureDto } from './dto/verify-signature.dto.js';


export type UserRole = 'organization' | 'user';

export type UserWithRole = User & {
  role: UserRole;
  skill_description?: SkillDescriptionUser | null;
  social_media?: SocialMediaUser | null;
  skill?: SkillUser | null;
  skills?: SkillUser[];
  organization?: Organization | null;
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

  /**
   * Resolve the `indexer_state.id` that belongs to a given `chain_id`.
   *
   * `nonce_connect.indexer_state_id` references `indexer_state.id`, and
   * `indexer_state` is unique per `(contract_name, chain_id)`. The indexer
   * stores its state under the `CompetitionManager` contract name, so the same
   * pair is used here to link the nonce to the correct chain.
   *
   * Returns `null` when no `chain_id` is provided or the chain has no indexer
   * state yet (the column is nullable, so callers can safely persist `null`).
   */
  private async resolveIndexerStateId(chainId?: number): Promise<string | null> {
    if (chainId === undefined || chainId === null || Number.isNaN(chainId)) {
      return null;
    }

    try {
      const state = await this.prisma.indexerState.findFirst({
        where: {
          chain_id: chainId,
        },
        select: { id: true },
      });
      return state?.id ?? null;
    } catch (dbError) {
      this.logger.warn(
        `Could not resolve indexer state for chain ${chainId}: ${dbError}`,
      );
      return null;
    }
  }

  private async getUserRole(userId: string): Promise<UserRole> {
    try {
      const org = await this.prisma.organization.findFirst({
        where: { user_id: userId },
        select: { id: true },
      });
      if (org) {
        return 'organization';
      }

      return 'user';
    } catch (dbError) {
      this.logger.warn(
        `Could not query database for user role relations: ${dbError}`,
      );
      return 'user';
    }
  }

  async generateNonce(
    dto?: RequestNonceDto,
    chainId?: number,
  ): Promise<NonceResponse> {
    const nonce = randomBytes(16).toString('hex');
    const walletAddress = dto?.walletAddress ? dto.walletAddress : undefined;

    let user: User | null = null;

    if (walletAddress) {
      try {
        user = await this.prisma.user.findFirst({
          where: {
            wallet_address: {
              equals: walletAddress,
              mode: 'insensitive',
            },
          },
        });

        if (!user) {
          try {
            user = await this.prisma.user.create({
              data: {
                id: generateUlid(),
                wallet_address: walletAddress,
              },
            });
          } catch {
            user = await this.prisma.user.findFirst({
              where: {
                wallet_address: {
                  equals: walletAddress,
                  mode: 'insensitive',
                },
              },
            });
          }
        }

        if (user) {
          const indexerStateId = await this.resolveIndexerStateId(chainId);
          await this.prisma.nonceConnect.upsert({
            where: { user_id: user.id },
            create: {
              id: generateUlid(),
              nonce,
              user_id: user.id,
              indexer_state_id: indexerStateId,
            },
            update: {
              nonce,
              indexer_state_id: indexerStateId,
            },
          });
        }
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
    chainId?: number,
  ): Promise<VerifySignatureResponse> {
    const walletAddress = dto.walletAddress;
    let messageToVerify = dto.message;
    let storedNonce: string | undefined = dto.nonce;

    const indexerStateId = await this.resolveIndexerStateId(chainId);

    try {
      const user = await this.prisma.user.findFirst({
        where: {
          wallet_address: {
            equals: walletAddress,
            mode: 'insensitive',
          },
        },
        include: { nonce_connect: true },
      });
      const nonceConnect = user?.nonce_connect ?? null;
      if (nonceConnect?.nonce) {
        // Only accept the stored nonce when it belongs to the requested chain.
        // Legacy rows (or chains without an indexer state) keep a null link and
        // are treated as chain-agnostic so the login flow never hard-fails.
        const matchesChain =
          chainId === undefined ||
          indexerStateId === null ||
          nonceConnect.indexer_state_id == null ||
          nonceConnect.indexer_state_id === indexerStateId;
        if (matchesChain) {
          storedNonce = nonceConnect.nonce;
        }
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
      user = await this.prisma.user.findFirst({
        where: {
          wallet_address: {
            equals: walletAddress,
            mode: 'insensitive',
          },
        },
      });

      if (!user) {
        try {
          user = await this.prisma.user.create({
            data: {
              id: generateUlid(),
              wallet_address: walletAddress,
            },
          });
        } catch {
          user = await this.prisma.user.findFirst({
            where: {
              wallet_address: {
                equals: walletAddress,
                mode: 'insensitive',
              },
            },
          });
        }
      }

      if (user) {
        await this.prisma.nonceConnect.deleteMany({
          where: { user_id: user.id },
        });
      }
    } catch (dbError) {
      this.logger.warn(
        `Could not sync user or clear nonce from database: ${dbError}`,
      );
    }

    const activeUser: User = user ?? {
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

    const role = await this.getUserRole(activeUser.id);
    let organization: Organization | null = null;
    if (activeUser.id) {
      try {
        organization = await this.prisma.organization.findFirst({
          where: { user_id: activeUser.id },
        });
      } catch {
        // ignore
      }
    }

    const payload = {
      sub: activeUser.id,
      wallet_address: walletAddress,
    };
    const token = this.jwtService.sign(payload);

    return {
      data: {
        token,
        user: {
          ...activeUser,
          role,
          organization,
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

    let user: any = null;
    try {
      if (userId) {
        user = await this.prisma.user.findUnique({
          where: { id: userId },
          include: {
            skill_description: true,
            social_media: true,
            skills: true,
            organizations: true,
          },
        });
      }
      if (!user && walletAddress) {
        user = await this.prisma.user.findFirst({
          where: {
            wallet_address: {
              equals: walletAddress,
              mode: 'insensitive',
            },
          },
          include: {
            skill_description: true,
            social_media: true,
            skills: true,
            organizations: true,
          },
        });
      }
    } catch (dbError) {
      this.logger.warn(`Could not query database for user: ${dbError}`);
    }

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const role = await this.getUserRole(user.id);
    const { organizations, ...userWithoutOrganizations } = user;
    const organization =
      organizations && organizations.length > 0 ? organizations[0] : null;

    return {
      data: {
        user: {
          ...userWithoutOrganizations,
          role,
          skill_description: user.skill_description ?? null,
          social_media: user.social_media ?? null,
          skills: user.skills ?? [],
          organization,
        },
      },
      message: 'User profile retrieved successfully',
      errors: null,
    };
  }
}
