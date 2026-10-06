import { PrismaClient } from '@prisma/client';

/**
 * Clears the demo business's payment history so the daily budget starts fresh.
 *
 * The policy engine charges spend against a rolling UTC day, so a few demo
 * runs will legitimately exhaust the agent's 20,000 USDC allowance and every
 * later payment gets denied for the right reason. That is correct behaviour,
 * not a bug — but it makes the demo unrepeatable, so this resets the clock.
 *
 * Business, agent, API key, allowlist and webhook endpoint are all left
 * alone: the key you already have keeps working.
 */
const prisma = new PrismaClient();

const BUSINESS_ID = 'demo_business';

async function main() {
  const business = await prisma.business.findUnique({
    where: { id: BUSINESS_ID },
  });

  if (!business) {
    console.error(`${BUSINESS_ID} not found — run \`npm run seed\` first.`);
    process.exit(1);
  }

  const agents = await prisma.agent.findMany({
    where: { businessId: BUSINESS_ID },
    select: { id: true },
  });

  // Intent events cascade from the intent; deliveries cascade only from the
  // endpoint, and idempotency records have no relation at all, so both have
  // to be cleared explicitly.
  const deliveries = await prisma.webhookDelivery.deleteMany({
    where: { endpoint: { businessId: BUSINESS_ID } },
  });
  const intents = await prisma.paymentIntent.deleteMany({
    where: { businessId: BUSINESS_ID },
  });
  const idempotency = await prisma.idempotencyRecord.deleteMany({
    where: { agentId: { in: agents.map((agent) => agent.id) } },
  });

  console.log(
    `Cleared ${intents.count} payment intents, ${deliveries.count} webhook deliveries, ${idempotency.count} idempotency records.`,
  );
  console.log('Daily budget is back to 20,000 USDC. Your API key is unchanged.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
