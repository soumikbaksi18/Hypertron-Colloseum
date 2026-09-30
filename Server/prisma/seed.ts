import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'node:crypto';

const prisma = new PrismaClient();

function publicId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
}

async function main(): Promise<void> {
  // Deterministic demo tenant so re-seeding is safe.
  const businessId = 'demo_business';

  await prisma.paymentIntent.deleteMany({ where: { businessId } });
  await prisma.business.deleteMany({ where: { id: businessId } });

  const business = await prisma.business.create({
    data: {
      id: businessId,
      name: 'Northwind Components',
      viewPub: crypto.randomBytes(32).toString('hex'),
    },
  });

  // Limits in USDC minor units (6 decimals): 1 USDC = 1_000_000.
  const usdc = (whole: number) => BigInt(whole) * 1_000_000n;

  const agent = await prisma.agent.create({
    data: {
      publicId: publicId('agt'),
      businessId: business.id,
      label: 'procurement-agent',
      currency: 'USDC',
      perTxLimitMinor: usdc(5_000),
      dailyLimitMinor: usdc(20_000),
      autoApproveLimitMinor: usdc(1_000),
    },
  });

  const secret = crypto.randomBytes(24).toString('base64url');
  const rawKey = `ht_sk_${secret}`;

  await prisma.apiKey.create({
    data: {
      publicId: publicId('ak'),
      agentId: agent.id,
      keyPrefix: 'ht_sk',
      secretHash: await bcrypt.hash(rawKey, 12),
      lastFour: rawKey.slice(-4),
    },
  });

  await prisma.allowedPayee.createMany({
    data: [
      {
        businessId: business.id,
        payeeRef: 'supplier_acme',
        label: 'Acme Industrial Supply',
      },
      {
        businessId: business.id,
        payeeRef: 'supplier_globex',
        label: 'Globex Logistics',
      },
    ],
  });

  const signingSecret = crypto.randomBytes(32).toString('hex');
  await prisma.webhookEndpoint.create({
    data: {
      publicId: publicId('whe'),
      businessId: business.id,
      url: `http://localhost:${process.env.PORT ?? 4000}/dev/webhook-sink`,
      signingSecret,
      events: [],
    },
  });

  console.log('\nHypertron demo tenant ready\n');
  console.log(`  business        ${business.name} (${business.id})`);
  console.log(`  agent           ${agent.label} (${agent.publicId})`);
  console.log(`  per-tx limit    ${agent.perTxLimitMinor} minor (5,000 USDC)`);
  console.log(`  daily limit     ${agent.dailyLimitMinor} minor (20,000 USDC)`);
  console.log(`  auto-approve    ${agent.autoApproveLimitMinor} minor (1,000 USDC)`);
  console.log('  allowed payees  supplier_acme, supplier_globex');
  console.log(`\n  HYPERTRON_API_KEY=${rawKey}\n`);
  console.log(`  webhook secret  ${signingSecret}\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
