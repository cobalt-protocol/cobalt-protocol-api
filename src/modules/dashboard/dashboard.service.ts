import { Injectable, Logger } from '@nestjs/common';
import { createPublicClient, getAddress, http, parseAbi } from 'viem';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface ChainConfig {
  name: string;
  rpc: string;
  native_symbol: string;
  coin_id?: string | null;
  platform_id?: string | null;
}

const SUPPORTED_CHAINS: Record<number, ChainConfig> = {
  // Ethereum
  1: {
    name: 'Ethereum Mainnet',
    rpc: 'https://ethereum-rpc.publicnode.com',
    native_symbol: 'ETH',
    coin_id: 'ethereum',
    platform_id: 'ethereum',
  },
  11155111: {
    name: 'Ethereum Sepolia',
    rpc: 'https://ethereum-sepolia-rpc.publicnode.com',
    native_symbol: 'ETH',
    coin_id: null,
    platform_id: 'ethereum',
  },
  // Base
  8453: {
    name: 'Base Mainnet',
    rpc: 'https://mainnet.base.org',
    native_symbol: 'ETH',
    coin_id: 'ethereum',
    platform_id: 'base',
  },
  84532: {
    name: 'Base Sepolia',
    rpc: 'https://sepolia.base.org',
    native_symbol: 'ETH',
    coin_id: null,
    platform_id: 'base',
  },
  // BNB Smart Chain
  56: {
    name: 'BNB Smart Chain',
    rpc: 'https://bsc-dataseed.binance.org',
    native_symbol: 'BNB',
    coin_id: 'binancecoin',
    platform_id: 'binance-smart-chain',
  },
  // Polygon PoS
  137: {
    name: 'Polygon PoS',
    rpc: 'https://polygon.drpc.org',
    native_symbol: 'POL',
    coin_id: 'polygon-ecosystem-token',
    platform_id: 'polygon-pos',
  },
  // Arbitrum One
  42161: {
    name: 'Arbitrum One',
    rpc: 'https://arb1.arbitrum.io/rpc',
    native_symbol: 'ETH',
    coin_id: 'ethereum',
    platform_id: 'arbitrum-one',
  },
  // Optimism
  10: {
    name: 'Optimism',
    rpc: 'https://mainnet.optimism.io',
    native_symbol: 'ETH',
    coin_id: 'ethereum',
    platform_id: 'optimistic-ethereum',
  },
  // Avalanche C-Chain
  43114: {
    name: 'Avalanche C-Chain',
    rpc: 'https://api.avax.network/ext/bc/C/rpc',
    native_symbol: 'AVAX',
    coin_id: 'avalanche-2',
    platform_id: 'avalanche',
  },
  // BOT Chain
  677: {
    name: 'BOT Chain Mainnet',
    rpc: 'https://rpc.botchain.ai',
    native_symbol: 'BOT',
    coin_id: 'bot',
    platform_id: null,
  },
  // Monad
  143: {
    name: 'Monad Mainnet',
    rpc: 'https://rpc.monad.xyz',
    native_symbol: 'MON',
    coin_id: 'monad',
    platform_id: 'monad',
  },
  // Bohr Mainnet
  968: {
    name: 'Bohr Mainnet',
    rpc: process.env.RPC_URL || 'https://rpc.bohr.life',
    native_symbol: 'BRAC',
    coin_id: null,
    platform_id: null,
  },
};

const ERC20_ABI = parseAbi([
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
]);

const COINGECKO_URL = 'https://api.coingecko.com/api/v3';
const FRANKFURTER_URL = 'https://api.frankfurter.dev/v1/latest';

const STABLECOIN_SYMBOLS = new Set([
  'USDT',
  'USDC',
  'DAI',
  'BUSD',
  'FDUSD',
  'PYUSD',
  'USDD',
  'TUSD',
]);

interface TokenMetadata {
  symbol: string;
  decimals: number;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  // In-memory caches to reduce network / RPC calls
  private readonly tokenMetadataCache = new Map<string, TokenMetadata>();
  private readonly priceUsdCache = new Map<string, { price: number; timestamp: number }>();
  private idrRateCache: { rate: number; timestamp: number } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get dashboard metrics including total deposited funds in USD and IDR.
   */
  async getDashboard() {
    const deposits = await this.prisma.prizeDeposited.findMany({
      where: {
        deleted_at: null,
      },
      include: {
        indexer_state: true,
      },
    });

    const defaultChainId = Number(process.env.CHAIN_ID || 968);
    const usdToIdrRate = await this.getUsdToIdr();

    let totalUsd = 0;

    for (const deposit of deposits) {
      try {
        const chainId = deposit.indexer_state?.chain_id || defaultChainId;
        const tokenAddress = deposit.token_address?.trim();

        const tokenInfo = await this.getTokenInfo(chainId, tokenAddress);
        const priceUsd = await this.getPriceUsd(chainId, tokenAddress, tokenInfo.symbol);

        const scaledAmount = this.formatAmount(deposit.amount, tokenInfo.decimals);
        const depositUsd = scaledAmount * priceUsd;

        totalUsd += depositUsd;
      } catch (err: any) {
        this.logger.warn(
          `Failed to process deposit id ${deposit.id} (token: ${deposit.token_address}): ${err?.message}`,
        );
      }
    }

    const totalIdr = totalUsd * usdToIdrRate;

    const priceUsd = Number(totalUsd.toFixed(2));
    const priceIdr = Number(totalIdr.toFixed(2));

    // Query total builders from submission_project via team_id to team_role
    const submissions = await this.prisma.submissionProject.findMany({
      where: {
        deleted_at: null,
      },
      select: {
        team_id: true,
      },
    });

    const teamIds = submissions
      .map((s) => s.team_id)
      .filter((id): id is string => Boolean(id));

    const totalBuilders =
      teamIds.length > 0
        ? await this.prisma.teamRole.count({
            where: {
              team_id: { in: teamIds },
              deleted_at: null,
            },
          })
        : 0;

    return {
      data: {
        deposited: {
          price_usd: priceUsd,
          price_idr: priceIdr,
        },
        total_builders: totalBuilders,
      },
      deposited: {
        price_usd: priceUsd,
        price_idr: priceIdr,
      },
      total_builders: totalBuilders,
      message: 'Dashboard data retrieved successfully',
      errors: null,
    };
  }

  /**
   * Resolve chain configuration by chainId.
   */
  private getChainConfig(chainId: number): ChainConfig {
    if (SUPPORTED_CHAINS[chainId]) {
      return SUPPORTED_CHAINS[chainId];
    }

    const envRpc = process.env.RPC_URL;
    return {
      name: `Chain ${chainId}`,
      rpc: envRpc || 'https://rpc.bohr.life',
      native_symbol: 'ETH',
      coin_id: null,
      platform_id: null,
    };
  }

  /**
   * Query token symbol and decimals from chain (or cache).
   */
  private async getTokenInfo(
    chainId: number,
    tokenAddress?: string | null,
  ): Promise<TokenMetadata> {
    const config = this.getChainConfig(chainId);

    const isNative =
      !tokenAddress ||
      tokenAddress === '0x0000000000000000000000000000000000000000' ||
      tokenAddress === '0x0';

    if (isNative) {
      return {
        symbol: config.native_symbol,
        decimals: 18,
      };
    }

    const cacheKey = `${chainId}:${tokenAddress.toLowerCase()}`;
    const cached = this.tokenMetadataCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const client = createPublicClient({
        transport: http(config.rpc, { timeout: 8_000 }),
      });

      const checksumAddress = getAddress(tokenAddress);
      const [decimals, symbol] = await Promise.all([
        client.readContract({
          address: checksumAddress,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }),
        client.readContract({
          address: checksumAddress,
          abi: ERC20_ABI,
          functionName: 'symbol',
        }),
      ]);

      const result: TokenMetadata = {
        symbol: String(symbol),
        decimals: Number(decimals),
      };

      this.tokenMetadataCache.set(cacheKey, result);
      return result;
    } catch (err: any) {
      this.logger.warn(
        `Failed to read ERC-20 symbol/decimals for ${tokenAddress} on chain ${chainId}: ${err?.message}`,
      );

      // Default fallback
      const fallback: TokenMetadata = {
        symbol: 'UNKNOWN',
        decimals: 18,
      };
      return fallback;
    }
  }

  /**
   * Fetch token USD price via CoinGecko or stablecoin heuristics.
   */
  private async getPriceUsd(
    chainId: number,
    tokenAddress?: string | null,
    symbol?: string,
  ): Promise<number> {
    const symUpper = (symbol || '').toUpperCase();

    // Stablecoin fast-path
    if (STABLECOIN_SYMBOLS.has(symUpper) || symUpper.includes('USD')) {
      return 1.0;
    }

    const config = this.getChainConfig(chainId);
    const isNative =
      !tokenAddress ||
      tokenAddress === '0x0000000000000000000000000000000000000000' ||
      tokenAddress === '0x0';

    const cacheKey = isNative
      ? `native:${config.coin_id || config.native_symbol}`
      : `${chainId}:${tokenAddress.toLowerCase()}`;

    const now = Date.now();
    const cached = this.priceUsdCache.get(cacheKey);
    if (cached && now - cached.timestamp < 5 * 60 * 1000) {
      return cached.price;
    }

    try {
      if (isNative) {
        if (!config.coin_id) {
          return 0;
        }

        const url = `${COINGECKO_URL}/simple/price?ids=${encodeURIComponent(
          config.coin_id,
        )}&vs_currencies=usd`;

        const res = await fetch(url, {
          headers: { accept: 'application/json' },
          signal: AbortSignal.timeout(6_000),
        });

        if (!res.ok) {
          throw new Error(`CoinGecko HTTP ${res.status}`);
        }

        const data = await res.json();
        const price = data?.[config.coin_id]?.usd ?? 0;

        if (price > 0) {
          this.priceUsdCache.set(cacheKey, { price, timestamp: now });
        }
        return price;
      }

      // ERC-20
      if (!config.platform_id) {
        // Unknown or custom network, check if symbol looks like ETH/WETH
        if (symUpper === 'WETH' || symUpper === 'ETH') {
          return this.getPriceUsd(1, null, 'ETH');
        }
        return 0;
      }

      const checksumAddress = getAddress(tokenAddress!);
      const url = `${COINGECKO_URL}/simple/token_price/${config.platform_id}?contract_addresses=${checksumAddress}&vs_currencies=usd`;

      const res = await fetch(url, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(6_000),
      });

      if (!res.ok) {
        throw new Error(`CoinGecko HTTP ${res.status}`);
      }

      const data = await res.json();
      const lower = checksumAddress.toLowerCase();
      const price = data?.[lower]?.usd ?? data?.[checksumAddress]?.usd ?? 0;

      if (price > 0) {
        this.priceUsdCache.set(cacheKey, { price, timestamp: now });
      }
      return price;
    } catch (err: any) {
      this.logger.warn(
        `Failed to fetch USD price for ${tokenAddress || config.native_symbol}: ${err?.message}`,
      );

      // If we have an older cached price, use it
      if (cached) {
        return cached.price;
      }
      return 0;
    }
  }

  /**
   * Fetch latest USD to IDR rate from Frankfurter API.
   */
  private async getUsdToIdr(): Promise<number> {
    const now = Date.now();
    if (this.idrRateCache && now - this.idrRateCache.timestamp < 10 * 60 * 1000) {
      return this.idrRateCache.rate;
    }

    try {
      const res = await fetch(`${FRANKFURTER_URL}?base=USD&symbols=IDR`, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(5_000),
      });

      if (!res.ok) {
        throw new Error(`Frankfurter HTTP ${res.status}`);
      }

      const data = await res.json();
      const rate = data?.rates?.IDR;

      if (typeof rate === 'number' && rate > 0) {
        this.idrRateCache = { rate, timestamp: now };
        return rate;
      }
    } catch (err: any) {
      this.logger.warn(`Failed to fetch USD to IDR rate: ${err?.message}`);
    }

    return this.idrRateCache?.rate ?? 16_200;
  }

  /**
   * Convert token raw amount (from DB Decimal) to floating-point number using decimals.
   */
  private formatAmount(amount: any, decimals: number): number {
    if (!amount) return 0;
    const strVal = amount.toString();
    const [intPart, fracPart = ''] = strVal.split('.');

    const intBig = BigInt(intPart || '0');
    const factor = BigInt(10) ** BigInt(decimals);

    const whole = Number(intBig / factor);
    const remainder = Number(intBig % factor) / Math.pow(10, decimals);
    let total = whole + remainder;

    if (fracPart) {
      total += Number(`0.${fracPart}`) / Math.pow(10, decimals);
    }

    return total;
  }
}

