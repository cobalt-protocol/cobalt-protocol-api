import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

describe('DashboardController', () => {
  let controller: DashboardController;
  let service: DashboardService;

  const mockDashboardService = {
    getDashboard: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        { provide: DashboardService, useValue: mockDashboardService },
      ],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
    service = module.get<DashboardService>(DashboardService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return dashboard response', async () => {
    const mockResponse = {
      data: {
        deposited: {
          price_usd: 10.5,
          price_idr: 190134,
        },
        total_builders: 42,
      },
      deposited: {
        price_usd: 10.5,
        price_idr: 190134,
      },
      total_builders: 42,
      message: 'Dashboard data retrieved successfully',
      errors: null,
    };

    mockDashboardService.getDashboard.mockResolvedValue(mockResponse);

    const result = await controller.getDashboard();
    expect(result).toEqual(mockResponse);
    expect(service.getDashboard).toHaveBeenCalledTimes(1);
  });
});

