import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ChainService } from './chain.service.js';

@ApiTags('Chains')
@Controller('chains')
export class ChainController {
  constructor(private readonly chainService: ChainService) {}

  @Get(':chain_id/competitions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all competitions by chain ID',
  })
  @ApiParam({
    name: 'chain_id',
    required: true,
    description: 'Chain ID',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Competitions retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'No competitions found for the specified chain ID',
  })
  async getCompetitionsByChainId(
    @Param('chain_id', ParseIntPipe) chainId: number,
  ) {
    return this.chainService.getCompetitionsByChainId(chainId);
  }
}
