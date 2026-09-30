import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '../src/generated/prisma/client.js';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
  errorFormat: 'pretty',
  adapter: adapter,
});
const jwtService = new JwtService({
  secret: process.env.JWT_SECRET || 'cobalt-protocol-jwt-secret-key-2026',
});

async function main() {
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

  const accessToken = jwtService.sign({
    sub: user.id,
    wallet_address: user.wallet_address,
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

  const organizationToken = jwtService.sign({
    sub: organizer.id,
    wallet_address: organizer.wallet_address,
  });

  const organization = await prisma.organization.upsert({
    where: { name: 'Cobalt Demo Organizer' },
    update: { user_id: organizer.id, deleted_at: null },
    create: {
      id: randomUUID(),
      tx_hash: '0x1234567890abcdef',
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
