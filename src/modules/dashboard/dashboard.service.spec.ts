import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DashboardService } from './dashboard.service.js';

describe('DashboardService', () => {
  let service: DashboardService;

  const mockPrismaService = {
    prizeDeposited: {
      findMany: vi.fn(),
    },
    submissionProject: {
      findMany: vi.fn(),
    },
    teamRole: {
      count: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should calculate deposited price in usd and idr', async () => {
    mockPrismaService.prizeDeposited.findMany.mockResolvedValue([
      {
        id: '01M5PS3VAVVJ64R1D0JSXR58SS',
        amount: '4500000',
        token_address: '0x75edC9335175Fc0552D51D48439F229c10420fe3',
        indexer_state: {
          chain_id: 968,
        },
      },
    ]);

    // Mock internal methods
    vi.spyOn(service as any, 'getTokenInfo').mockResolvedValue({
      symbol: 'USDT',
      decimals: 6,
    });
    vi.spyOn(service as any, 'getPriceUsd').mockResolvedValue(1.0);
    vi.spyOn(service as any, 'getUsdToIdr').mockResolvedValue(16000);

    mockPrismaService.submissionProject.findMany.mockResolvedValue([
      { team_id: 'TEAM_1' },
      { team_id: 'TEAM_2' },
    ]);
    mockPrismaService.teamRole.count.mockResolvedValue(5);

    const result = await service.getDashboard();

    expect(result.deposited.price_usd).toBe(4.5);
    expect(result.deposited.price_idr).toBe(72000);
    expect(result.total_builders).toBe(5);
    expect(result.data.deposited.price_usd).toBe(4.5);
    expect(result.data.deposited.price_idr).toBe(72000);
    expect(result.data.total_builders).toBe(5);
    expect(result.message).toBe('Dashboard data retrieved successfully');
  });

  it('should handle zero deposits and zero submissions gracefully', async () => {
    mockPrismaService.prizeDeposited.findMany.mockResolvedValue([]);
    mockPrismaService.submissionProject.findMany.mockResolvedValue([]);
    vi.spyOn(service as any, 'getUsdToIdr').mockResolvedValue(16000);

    const result = await service.getDashboard();

    expect(result.deposited.price_usd).toBe(0);
    expect(result.deposited.price_idr).toBe(0);
    expect(result.total_builders).toBe(0);
    expect(result.data.total_builders).toBe(0);
  });
});

