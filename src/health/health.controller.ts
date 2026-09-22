import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

interface HealthData {
  status: 'ok';
  timestamp: string;
  uptimeSeconds: number;
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Check whether the application is running' })
  @ApiOkResponse({
    description: 'The application is healthy',
    schema: {
      example: {
        data: {
          status: 'ok',
          timestamp: '2026-09-19T00:00:00.000Z',
          uptimeSeconds: 42,
        },
        message: 'Success',
        errors: null,
      },
    },
  })
  check(): HealthData {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }
}

