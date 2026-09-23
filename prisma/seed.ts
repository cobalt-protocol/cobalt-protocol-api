import { PrismaPg } from '@prisma/adapter-pg';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaClient } from '../src/generated/prisma/client.js';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
  errorFormat: 'pretty',
  adapter: adapter,
});
const accessToken = 'dummy-user-access-token-for-testing-123456789';
const organizationToken =
  'dummy-organization-access-token-for-testing-123456789';

for (const token of [accessToken, organizationToken]) {
  if (!/^[A-Za-z0-9_-]{43,128}$/.test(token)) {
    throw new Error('Dummy access tokens must satisfy AuthSessionGuard format');
  }
}

async function main() {
  const tokenHash = createHash('sha256').update(accessToken).digest('hex');
  const organizationTokenHash = createHash('sha256')
    .update(organizationToken)
    .digest('hex');

  const user = await prisma.user.upsert({
    where: {
      wallet_address: '0x0000000000000000000000000000000000000001',
    },
    update: {},
    create: {
      id: randomUUID(),
      wallet_address: '0x0000000000000000000000000000000000000001',
      username: 'dummy-user',
      email: 'dummy-user@example.com',
      location: 'Indonesia',
      institution: 'Cobalt Protocol',
    },
  });

  await prisma.authSession.upsert({
    where: {
      token_hash: tokenHash,
    },
    update: {
      user_id: user.id,
      revoked_at: null,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    create: {
      id: randomUUID(),
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('Dummy user:', user.id);
  console.log('Dummy access token:', accessToken);

  const organizer = await prisma.user.upsert({
    where: {
      wallet_address: '0x0000000000000000000000000000000000000002',
    },
    update: {},
    create: {
      id: randomUUID(),
      wallet_address: '0x0000000000000000000000000000000000000002',
      username: 'dummy-organizer',
      email: 'organizer@example.com',
      location: 'Indonesia',
      institution: 'Cobalt Protocol',
    },
  });

  await prisma.authSession.upsert({
    where: {
      token_hash: organizationTokenHash,
    },
    update: {
      user_id: organizer.id,
      revoked_at: null,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    create: {
      id: randomUUID(),
      user_id: organizer.id,
      token_hash: organizationTokenHash,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const organization = await prisma.organization.upsert({
    where: { name: 'Cobalt Demo Organizer' },
    update: { user_id: organizer.id, deleted_at: null },
    create: {
      id: randomUUID(),
      avatar_url: 'https://placehold.co/256x256?text=Cobalt',
      name: 'Cobalt Demo Organizer',
      description: 'Dummy organizer for local API development',
      user_id: organizer.id,
    },
  });

  console.log('Dummy organization:', organization.id);
  console.log('Dummy organizer access token:', organizationToken);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
