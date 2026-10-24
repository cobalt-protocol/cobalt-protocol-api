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
import { CreateSignatureTeamPaymentDto } from './dto/create-signature-team-payment.dto.js';
import { SignatureTeamPaymentService } from './signature-team-payment.service.js';

@ApiTags('Signature Team Payment')
@Controller('chains/:chain_id/competitions')
@UseGuards(AuthSessionGuard)
@ApiBearerAuth()
export class SignatureTeamPaymentController {
  constructor(private readonly service: SignatureTeamPaymentService) {}

  @Post('signature-team-payment')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Generate paymentCreateTeam signature (chain-scoped, persisted to signature_team_payment)',
    description:
      'POST api/v1/chains/:chain_id/competitions/signature-team-payment — protected by Bearer authentication token (AuthSessionGuard). Hash 1:1 dengan TeamPaymentModule.paymentCreateTeam / CompetitionHelper.verifySig: keccak256(abi.encodePacked(address(this), _competitionId, cid)) dan ditandatangani menggunakan EIP-191 oleh signerAddress (PRIVATE_KEY_SIGNER). Hasil signature disimpan ke tabel signature_team_payment.',
  })
  @ApiParam({
    name: 'chain_id',
    required: true,
    type: Number,
    description: 'Chain ID (indexer_state.chain_id)',
  })
  @ApiBody({ type: CreateSignatureTeamPaymentDto })
  @ApiResponse({
    status: 201,
    description: 'Signature generated and persisted to signature_team_payment',
  })
  @ApiResponse({ status: 400, description: 'Bad Request — invalid payload' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — silahkan update profile',
  })
  @ApiResponse({ status: 404, description: 'Competition not found on chain' })
  async createByChain(
    @Param('chain_id', ParseIntPipe) chainId: number,
    @Body() dto: CreateSignatureTeamPaymentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.generate(chainId, dto, req.userId);
  }

  @Post(':competition_id/signature-team-payment')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Generate paymentCreateTeam signature by competition_id in path (chain-scoped, persisted to signature_team_payment)',
    description:
      'POST api/v1/chains/:chain_id/competitions/:competition_id/signature-team-payment — protected by Bearer authentication token (AuthSessionGuard). Hash 1:1 dengan TeamPaymentModule.paymentCreateTeam / CompetitionHelper.verifySig: keccak256(abi.encodePacked(address(this), _competitionId, cid)) dan ditandatangani menggunakan EIP-191 oleh signerAddress (PRIVATE_KEY_SIGNER). Hasil signature disimpan ke tabel signature_team_payment.',
  })
  @ApiParam({
    name: 'chain_id',
    required: true,
    type: Number,
    description: 'Chain ID (indexer_state.chain_id)',
  })
  @ApiParam({
    name: 'competition_id',
    required: true,
    type: String,
    description: 'Competition ID (database ULID `id` or on-chain `competition_id`)',
  })
  @ApiBody({ type: CreateSignatureTeamPaymentDto })
  @ApiResponse({
    status: 201,
    description: 'Signature generated and persisted to signature_team_payment',
  })
  @ApiResponse({ status: 400, description: 'Bad Request — invalid payload' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — silahkan update profile',
  })
  @ApiResponse({ status: 404, description: 'Competition not found on chain' })
  async createByChainAndCompetition(
    @Param('chain_id', ParseIntPipe) chainId: number,
    @Param('competition_id') competitionId: string,
    @Body() dto: CreateSignatureTeamPaymentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.generate(chainId, dto, req.userId, competitionId);
  }
}

