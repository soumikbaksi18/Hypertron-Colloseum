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
  const transfer2Vk = path.join(path.resolve(cfg.keysDir), 'transfer2.vk.json');
  const transferVk = fs.existsSync(transfer2Vk)
    ? transfer2Vk
    : fs.existsSync(prover.vkPath('transfer'))
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
  const transferVkId = fs.existsSync(transfer2Vk)
    ? VK_ID.transfer2
    : VK_ID.transfer;
  const transferAddr = await client.registerVkFromFile(transferVk, transferVkId);
  console.log(`transfer vk ${transferAddr} id=${transferVkId}`);
  const transferOneFile = prover.vkPath('transfer');
  if (fs.existsSync(transferOneFile)) {
    const transferOneAddr = await client.registerVkFromFile(
      transferOneFile,
      VK_ID.transferOne,
    );
    console.log(`transfer-one vk ${transferOneAddr} id=${VK_ID.transferOne}`);
  }

  const pool = await client.initializePool({
    deposit: VK_ID.deposit,
    unshield: VK_ID.unshield,
    transfer: transferVkId,
  });
  try {
    if (fs.existsSync(transfer2Vk)) {
      const rotated = await client.setTransferVk(VK_ID.transfer2);
      console.log(`transfer vk rotated ${rotated}`);
    }
  } catch (error) {
    console.warn(`set_transfer_vk skipped: ${String(error)}`);
  }
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
