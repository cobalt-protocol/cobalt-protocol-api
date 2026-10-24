import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AuthSessionGuard,
  type AuthenticatedRequest,
} from '../../auth/auth-session.guard.js';
import { CreateSignatureCreateCompetitionDto } from './dto/create-signature-create-competition.dto.js';
import { SignatureCreateCompetitionService } from './signature-create-competition.service.js';

@ApiTags('Signature Create Competition')
@Controller('chains/:chain_id/competitions/signature-create-competition')
@UseGuards(AuthSessionGuard)
@ApiBearerAuth()
export class SignatureCreateCompetitionController {
  constructor(private readonly service: SignatureCreateCompetitionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Generate createCompetition signature (chain-scoped, persisted to signature_create_competition)',
    description:
      'POST api/v1/chains/:chain_id/competitions/signature-create-competition — protected by Bearer authentication token (AuthSessionGuard). Hash 1:1 dengan CompetitionCreationModule.createCompetition / CompetitionHelper.verifySig: keccak256(abi.encode(address(this), _competition, _payment, _winners, _priceCompetitionFeeId)) dan ditandatangani menggunakan EIP-191 oleh signerAddress (PRIVATE_KEY_SIGNER). Hasil signature disimpan ke tabel signature_create_competition.',
  })
  @ApiParam({
    name: 'chain_id',
    required: true,
    type: Number,
    description: 'Chain ID (indexer_state.chain_id)',
  })
  @ApiBody({ type: CreateSignatureCreateCompetitionDto })
  @ApiResponse({
    status: 201,
    description: 'Signature generated and persisted to signature_create_competition',
  })
  @ApiResponse({ status: 400, description: 'Bad Request — invalid payload' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — silahkan update organization profile',
  })
  async createByChain(
    @Param('chain_id', ParseIntPipe) chainId: number,
    @Body() dto: CreateSignatureCreateCompetitionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.generate(dto, req.userId, chainId);
  }
}

