import {
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

export async function signHashWithSigner(
  hash: `0x${string}`,
): Promise<`0x${string}`> {
  const account = getSignerAccount();
  const signature = await account.signMessage({ message: { raw: hash } });
  return signature as `0x${string}`;
}
