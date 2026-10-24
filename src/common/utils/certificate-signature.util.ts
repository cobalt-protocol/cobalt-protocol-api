import {
  encodeAbiParameters,
  encodePacked,
  getAddress,
  isAddress,
  keccak256,
  stringToHex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

export function deriveNumericTeamId(teamId: string): bigint {
  try {
    const n = BigInt(teamId);
    if (n > 0n) return n;
    throw new Error('non-positive');
  } catch {
    const hash = keccak256(stringToHex(teamId));
    const n = BigInt(hash);
    return n === 0n ? 1n : n;
  }
}

export function getCompetitionContractAddress(): `0x${string}` {
  const raw = process.env.COMPETITION_CONTRACT;
  if (!raw || !isAddress(raw)) {
    // Unified canonical CompetitionManager on BotChain testnet
    // Must match web NEXT_PUBLIC_COMPETITION_CONTRACT=0x9e6b43620BfE855f48535229304820C9d8D779F5
    const fallback =
      '0x9e6b43620BfE855f48535229304820C9d8D779F5' as `0x${string}`;
    if (!raw) {
      return fallback;
    }
    throw new Error(`Invalid COMPETITION_CONTRACT address: ${raw}`);
  }
  return getAddress(raw);
}

/**
 * Resolve the CompetitionManager address that a competition belongs to.
 * The signed hash includes address(this), so it MUST be the contract that
 * actually holds the competition (indexer_state.contract_address), not a
 * global env value — otherwise redeployed contracts yield InvalidSignature.
 * Falls back to COMPETITION_CONTRACT only if the competition has no indexer_state.
 */
export function resolveCompetitionContractAddress(competition?: {
  indexer_state?: { contract_address?: string | null } | null;
}): `0x${string}` {
  const fromState = competition?.indexer_state?.contract_address;
  if (fromState) {
    if (!isAddress(fromState)) {
      throw new Error(
        `Invalid indexer_state.contract_address: ${fromState}`,
      );
    }
    return getAddress(fromState);
  }
  return getCompetitionContractAddress();
}

export function getSignerAccount() {
  const rawPrivateKey =
    process.env.PRIVATE_KEY_SIGNER ||
    '6e21894af5b0ff3b4dc3659ad7a0df21a9070be22d24b35698632294756fd9cc';
  const formatted = (
    rawPrivateKey.startsWith('0x') ? rawPrivateKey : `0x${rawPrivateKey}`
  ) as `0x${string}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(formatted)) {
    throw new Error('Invalid PRIVATE_KEY_SIGNER format');
  }
  return privateKeyToAccount(formatted);
}

/**
 * Must match CompetitionManager.safeMintCertificateParticipant:
 * keccak256(abi.encodePacked(address(this), msg.sender, _competitionId, _teamId, cid))
 * _teamId = string
 * cid = competition.certificateCID raw (no ipfs:// prefix)
 */
export function hashParticipantCertificate(
  contractAddress: `0x${string}`,
  participantAddress: `0x${string}`,
  onchainCompetitionId: bigint,
  teamId: string,
  certificateCidRaw: string,
): `0x${string}` {
  return keccak256(
    encodePacked(
      ['address', 'address', 'uint256', 'string', 'string'],
      [
        contractAddress,
        participantAddress,
        onchainCompetitionId,
        teamId,
        certificateCidRaw,
      ],
    ),
  );
}

/**
 * Must match CompetitionManager.safeMintCertificateParticipantWinner:
 * keccak256(abi.encodePacked(address(this), msg.sender, _winnerId, uri))
 * uri = "ipfs://" + winner.certificateCID  (via IPFSHelper.toIPFSURI)
 */
export function hashWinnerCertificate(
  contractAddress: `0x${string}`,
  participantAddress: `0x${string}`,
  winnerId: bigint,
  uri: string,
): `0x${string}` {
  return keccak256(
    encodePacked(
      ['address', 'address', 'uint256', 'string'],
      [contractAddress, participantAddress, winnerId, uri],
    ),
  );
}

/**
 * Must match CompetitionManager.setWinner / CompetitionHelper.verifySig:
 * keccak256(abi.encodePacked(address(this), _winnerId, _participant, _competitionId, _teamId))
 * _participant = team LEAD wallet address (checksum)
 * _teamId = string
 */
export function hashSetWinner(
  contractAddress: `0x${string}`,
  winnerId: bigint,
  participantAddress: `0x${string}`,
  onchainCompetitionId: bigint,
  teamId: string,
): `0x${string}` {
  return keccak256(
    encodePacked(
      ['address', 'uint256', 'address', 'uint256', 'string'],
      [
        contractAddress,
        winnerId,
        participantAddress,
        onchainCompetitionId,
        teamId,
      ],
    ),
  );
}

export interface CreateCompetitionPaymentStruct {
  tokenAddress: `0x${string}`;
  fee: bigint;
}

export interface CreateCompetitionStruct {
  id: bigint;
  cid: string;
  formation: string;
  organization: `0x${string}`;
  prizeCertificateClaim: bigint;
  certificateCID: string;
  payment: CreateCompetitionPaymentStruct;
}

export interface CreateCompetitionWinnerStruct {
  id: bigint;
  competitionId: bigint;
  prizeToken: `0x${string}`;
  prizeAmount: bigint;
  certificateCID: string;
}

/**
 * Must match CompetitionCreationModule.createCompetition / CompetitionHelper.verifySig:
 * keccak256(abi.encode(address(this), _competition, _payment, _winners, _priceCompetitionFeeId))
 */
export function hashCreateCompetition(
  contractAddress: `0x${string}`,
  competition: CreateCompetitionStruct,
  payment: CreateCompetitionPaymentStruct,
  winners: CreateCompetitionWinnerStruct[],
  priceCompetitionFeeId: bigint,
): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      [
        { name: 'contractAddress', type: 'address' },
        {
          name: 'competition',
          type: 'tuple',
          components: [
            { name: 'id', type: 'uint256' },
            { name: 'cid', type: 'string' },
            { name: 'formation', type: 'string' },
            { name: 'organization', type: 'address' },
            { name: 'prizeCertificateClaim', type: 'uint256' },
            { name: 'certificateCID', type: 'string' },
            {
              name: 'payment',
              type: 'tuple',
              components: [
                { name: 'tokenAddress', type: 'address' },
                { name: 'fee', type: 'uint256' },
              ],
            },
          ],
        },
        {
          name: 'payment',
          type: 'tuple',
          components: [
            { name: 'tokenAddress', type: 'address' },
            { name: 'fee', type: 'uint256' },
          ],
        },
        {
          name: 'winners',
          type: 'tuple[]',
          components: [
            { name: 'id', type: 'uint256' },
            { name: 'competitionId', type: 'uint256' },
            { name: 'prizeToken', type: 'address' },
            { name: 'prizeAmount', type: 'uint256' },
            { name: 'certificateCID', type: 'string' },
          ],
        },
        { name: 'priceCompetitionFeeId', type: 'uint256' },
      ],
      [contractAddress, competition, payment, winners, priceCompetitionFeeId],
    ),
  );
}

/**
 * Must match TeamPaymentModule.paymentCreateTeam / CompetitionHelper.verifySig:
 * keccak256(abi.encodePacked(address(this), _competitionId, cid))
 */
export function hashTeamPayment(
  contractAddress: `0x${string}`,
  onchainCompetitionId: bigint,
  cid: string,
): `0x${string}` {
  return keccak256(
    encodePacked(
      ['address', 'uint256', 'string'],
      [contractAddress, onchainCompetitionId, cid],
    ),
  );
}

export async function signHashWithSigner(
  hash: `0x${string}`,
): Promise<`0x${string}`> {
  const account = getSignerAccount();
  const signature = await account.signMessage({ message: { raw: hash } });
  return signature as `0x${string}`;
}
