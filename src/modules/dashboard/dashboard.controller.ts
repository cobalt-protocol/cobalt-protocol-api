import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service.js';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get dashboard statistics',
    description:
      'Retrieves overall dashboard metrics including total deposited funds calculated in USD and IDR based on prize_deposited and indexer_state.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
    schema: {
      example: {
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
      },
    },
  })
  async getDashboard() {
    return this.dashboardService.getDashboard();
  }
}

