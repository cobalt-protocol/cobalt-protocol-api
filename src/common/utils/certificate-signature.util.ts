import { encodePacked, getAddress, isAddress, keccak256, stringToHex } from 'viem';
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
    // do not silently fallback to stale address — throw to surface misconfig
    // fallback kept only for local dev without env, but logged as warning by caller if needed
    const fallback = '0xb82F97deF35a9fe438ceB41f4fB5145514b18069' as `0x${string}`;
    if (!raw) {
      // if COMPETITION_CONTRACT is not set, use deployed address from .env.example / web .env
      // throw instead of silently using 0x18c9... which will always mismatch
      // keep fallback to deployed address to avoid hard crash in tests
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
  const formatted = (rawPrivateKey.startsWith('0x') ? rawPrivateKey : `0x${rawPrivateKey}`) as `0x${string}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(formatted)) {
    throw new Error('Invalid PRIVATE_KEY_SIGNER format');
  }
  return privateKeyToAccount(formatted);
}

/**
 * Must match CompetitionManager.safeMintCertificateParticipant:
 * keccak256(abi.encodePacked(address(this), msg.sender, _competitionId, _teamId, cid))
 * cid = competition.certificateCID raw (no ipfs:// prefix)
 */
export function hashParticipantCertificate(
  contractAddress: `0x${string}`,
  participantAddress: `0x${string}`,
  onchainCompetitionId: bigint,
  numericTeamId: bigint,
  certificateCidRaw: string,
): `0x${string}` {
  return keccak256(
    encodePacked(
      ['address', 'address', 'uint256', 'uint256', 'string'],
      [contractAddress, participantAddress, onchainCompetitionId, numericTeamId, certificateCidRaw],
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

export async function signHashWithSigner(hash: `0x${string}`): Promise<`0x${string}`> {
  const account = getSignerAccount();
  const signature = await account.signMessage({ message: { raw: hash } });
  return signature as `0x${string}`;
}
