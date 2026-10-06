/**
 * Register Groth16 VKs and initialize hypertron_pool for the configured mint.
 *
 * Prerequisites:
 *   - solana-test-validator (or a cluster) running
 *   - `anchor deploy` / `solana program deploy` of hypertron_pool
 *   - keys from scripts/pool-dev-keys.sh
 *   - POOL_MINT set to an existing SPL mint
 *
 *   cd Server && npx ts-node --compiler-options '{"module":"commonjs"}' scripts/pool-init.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

import { NestFactory } from '@nestjs/core';

import { AppModule } from '../src/app.module';
import { loadConfig } from '../src/common/config/configuration';
import { VK_ID } from '../src/modules/settlement/pool/pool.constants';
import { PoolClient } from '../src/modules/settlement/pool/pool.client';
import { PoolProver } from '../src/modules/settlement/pool/pool.prover';

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });
  const client = app.get(PoolClient);
  const prover = app.get(PoolProver);
  const cfg = loadConfig().pool;

  if (!cfg.mint) {
    throw new Error('Set POOL_MINT to the SPL mint this pool will vault.');
  }

  const depositVk = prover.vkPath('deposit');
  const unshieldVk = prover.vkPath('unshield');
  const transferVk = fs.existsSync(prover.vkPath('transfer'))
    ? prover.vkPath('transfer')
    : depositVk;

  if (!fs.existsSync(depositVk) || !fs.existsSync(unshieldVk)) {
    throw new Error(
      `Missing vk json under ${path.resolve(cfg.keysDir)}. Run scripts/pool-dev-keys.sh`,
    );
  }

  console.log(`rpc        ${cfg.rpcUrl}`);
  console.log(`program    ${client.programId().toBase58()}`);
  console.log(`mint       ${client.mint().toBase58()}`);
  console.log(`relayer    ${client.relayerKeypair().publicKey.toBase58()}`);

  const depositAddr = await client.registerVkFromFile(depositVk, VK_ID.deposit);
  console.log(`deposit vk ${depositAddr}`);
  const unshieldAddr = await client.registerVkFromFile(unshieldVk, VK_ID.unshield);
  console.log(`unshield vk ${unshieldAddr}`);
  const transferAddr = await client.registerVkFromFile(transferVk, VK_ID.transfer);
  console.log(`transfer vk ${transferAddr}`);

  const pool = await client.initializePool({
    deposit: VK_ID.deposit,
    unshield: VK_ID.unshield,
    transfer: VK_ID.transfer,
  });
  console.log(`pool       ${pool}`);

  const state = await client.fetchPool();
  const tree = await client.fetchTree();
  console.log(`decimals   ${state.decimals}`);
  console.log(`vault      ${state.vault.toBase58()}`);
  console.log(`tree index ${tree.nextIndex.toString()}`);

  await app.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
