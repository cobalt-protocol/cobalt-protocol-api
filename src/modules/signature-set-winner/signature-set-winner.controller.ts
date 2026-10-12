import { Body, Controller, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthSessionGuard, type AuthenticatedRequest } from '../../auth/auth-session.guard.js';
import { CreateSignatureSetWinnerDto } from './dto/create-signature-set-winner.dto.js';
import { SignatureSetWinnerService } from './signature-set-winner.service.js';

@ApiTags('Signature Set Winner')
@Controller('chains/:chain_id/competitions/:competition_id/signature-set-winner')
@UseGuards(AuthSessionGuard)
@ApiBearerAuth()
export class SignatureSetWinnerController {
  constructor(private readonly service: SignatureSetWinnerService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Generate setWinner signature (chain + competition scoped, persisted) — team LEAD as participant',
    description:
      'POST api/v1/chains/:chain_id/competitions/:competition_id/signature-set-winner — body { team_id, winner_id } dimana winner_id = prize_winner.id (ULID string row PK); on-chain uint256 _winnerId untuk hash/signature diambil dari kolom prize_winner.winner_id pada row tersebut. Hash 1:1 dengan CompetitionManager.setWinner / CompetitionHelper.verifySig: keccak256(abi.encodePacked(address(this), _winnerId, _participant, _competitionId, _teamId)) dimana _participant adalah wallet checksum dari team LEAD (team_role.role LEAD/leader, fallback team.user_id) dan signerAddress dari PRIVATE_KEY_SIGNER (env). Validasi chain via competition.indexer_state.chain_id, prize row existence via prize_winner.id + competition_id, dan team belongs to competition. Persist idempoten ke signature_set_winner (unique team_id) dengan user_id = lead user. Response: signature + hash langsung dipakai untuk CompetitionManager.setWinner(winnerId, participant, competitionId, teamId, signature).',
  })
  @ApiParam({ name: 'chain_id', required: true, type: Number, description: 'Chain ID (indexer_state.chain_id)' })
  @ApiParam({ name: 'competition_id', required: true, type: String, description: 'Competition ID (id | competition_id on-chain string)' })
  @ApiBody({ type: CreateSignatureSetWinnerDto })
  @ApiResponse({ status: 201, description: 'Signature generated and persisted' })
  @ApiResponse({ status: 400, description: 'Bad Request — invalid payload / wallet / competition not indexed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Competition / team / prize winner not found on chain' })
  async create(
    @Param('chain_id', ParseIntPipe) chainId: number,
    @Param('competition_id') competitionId: string,
    @Body() dto: CreateSignatureSetWinnerDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.generate(chainId, competitionId, dto, req.userId);
  }
}
