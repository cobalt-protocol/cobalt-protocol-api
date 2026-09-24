import { Controller, Get, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PriceCompetitionService } from './price-competition.service.js';

@ApiTags('Price Competitions')
@Controller('price-competitions')
export class PriceCompetitionController {
  constructor(private readonly priceCompetitionService: PriceCompetitionService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get list of all price competitions',
  })
  @ApiResponse({
    status: 200,
    description: 'Price competitions retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: '01J8Z9X0000000000000000001',
            tx_hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            price_competition_fee_id: '1',
            treasury_fee: '50.000000000000000000',
            token_address: '0x1234567890123456789012345678901234567890',
            title: 'Standard Price Competition',
            description: 'Price competition tier standard',
            created_at: '2026-09-23T00:00:00.000Z',
            updated_at: null,
            deleted_at: null,
            competitions: [],
          },
        ],
        message: 'Price competitions retrieved successfully',
        errors: null,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'No price competitions found',
    schema: {
      example: {
        data: null,
        message: 'No price competitions found',
        errors: null,
      },
    },
  })
  async findAll() {
    return this.priceCompetitionService.findAll();
  }

  @Get('fee/:price_competition_fee_id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get price competition explicitly by price_competition_fee_id',
  })
  @ApiParam({
    name: 'price_competition_fee_id',
    description: 'On-chain Price competition fee ID',
    type: String,
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description: 'Price competition retrieved successfully',
    schema: {
      example: {
        data: {
          id: '01J8Z9X0000000000000000001',
          tx_hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          price_competition_fee_id: '1',
          treasury_fee: '50.000000000000000000',
          token_address: '0x1234567890123456789012345678901234567890',
          title: 'Standard Price Competition',
          description: 'Price competition tier standard',
          created_at: '2026-09-23T00:00:00.000Z',
          updated_at: null,
          deleted_at: null,
          competitions: [],
        },
        message: 'Price competition retrieved successfully',
        errors: null,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Price competition not found',
    schema: {
      example: {
        data: null,
        message: 'Price competition not found',
        errors: null,
      },
    },
  })
  async findByFeeId(@Param('price_competition_fee_id') feeId: string) {
    return this.priceCompetitionService.findByFeeId(feeId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get price competition by ID or fee ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Price competition ID (ULID or fee ID)',
    type: String,
    example: '01J8Z9X0000000000000000001',
  })
  @ApiResponse({
    status: 200,
    description: 'Price competition retrieved successfully',
    schema: {
      example: {
        data: {
          id: '01J8Z9X0000000000000000001',
          tx_hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          price_competition_fee_id: '1',
          treasury_fee: '50.000000000000000000',
          token_address: '0x1234567890123456789012345678901234567890',
          title: 'Standard Price Competition',
          description: 'Price competition tier standard',
          created_at: '2026-09-23T00:00:00.000Z',
          updated_at: null,
          deleted_at: null,
          competitions: [],
        },
        message: 'Price competition retrieved successfully',
        errors: null,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Price competition not found',
    schema: {
      example: {
        data: null,
        message: 'Price competition not found',
        errors: null,
      },
    },
  })
  async findOne(@Param('id') id: string) {
    return this.priceCompetitionService.findOne(id);
  }
}

