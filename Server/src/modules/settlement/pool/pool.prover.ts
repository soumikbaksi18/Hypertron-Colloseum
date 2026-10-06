import { execFile } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';

import { Injectable, Logger } from '@nestjs/common';

import { loadConfig } from '../../../common/config/configuration';
import { hexToBytes, hexToFixed } from './pool.bytes';
import { MERKLE_DEPTH, PROOF_LEN } from './pool.constants';

const execFileAsync = promisify(execFile);

export interface ProofJson {
  proof: string;
  public_inputs: string[];
}

export interface DepositProofResult {
  commitment: string;
  proof: Buffer;
  publicInputs: string[];
}

export interface UnshieldProofResult {
  root: string;
  nullifier: string;
  changeCm: string;
  proof: Buffer;
  publicInputs: string[];
}

@Injectable()
export class PoolProver {
  private readonly logger = new Logger(PoolProver.name);

  private bin(): string {
    return loadConfig().pool.proveBin;
  }

  private keysDir(): string {
    return path.resolve(loadConfig().pool.keysDir);
  }

  depositPk(): string {
    return path.join(this.keysDir(), 'deposit.pk.bin');
  }

  unshieldPk(): string {
    return path.join(this.keysDir(), 'unshield.pk.bin');
  }

  vkPath(circuit: 'deposit' | 'unshield' | 'transfer'): string {
    return path.join(this.keysDir(), `${circuit}.vk.json`);
  }

  assertDepositKeys(): void {
    if (!fs.existsSync(this.depositPk())) {
      throw new Error(
        `Missing ${this.depositPk()}. Run scripts/pool-dev-keys.sh then pool:init.`,
      );
    }
  }

  async ownerPk(spendSk: string): Promise<string> {
    const { stdout } = await this.run(['owner-pk', '--spend-sk', spendSk]);
    return stdout.trim();
  }

  async nullifier(spendSk: string, k: string): Promise<string> {
    const { stdout } = await this.run(['nullifier', '--spend-sk', spendSk, '--k', k]);
    return stdout.trim();
  }

  async encryptNote(input: {
    recipientView: string;
    ownerPk: string;
    k: string;
    v: bigint;
  }): Promise<string | null> {
    const view = input.recipientView.trim();
    if (!view) return null;
    try {
      const { stdout } = await this.run([
        'encrypt',
        '--recipient-view',
        view.startsWith('0x') ? view : `0x${view}`,
        '--owner-pk',
        input.ownerPk,
        '--k',
        input.k,
        '--v',
        input.v.toString(),
      ]);
      return stdout.trim();
    } catch (error) {
      this.logger.warn(`note encrypt skipped: ${String(error)}`);
      return null;
    }
  }

  async depositProof(input: {
    ownerPk: string;
    k: string;
    amount: bigint;
  }): Promise<DepositProofResult> {
    this.assertDepositKeys();
    const out = this.tempFile('deposit-proof.json');
    try {
      const { stdout } = await this.run([
        'deposit-proof',
        '--pk',
        this.depositPk(),
        '--owner-pk',
        input.ownerPk,
        '--k',
        input.k,
        '--amount',
        input.amount.toString(),
        '--out',
        out,
      ]);
      const parsed = this.readProof(out);
      const commitment =
        stdout
          .split('\n')
          .find((line) => line.startsWith('commitment '))
          ?.slice('commitment '.length)
          .trim() ?? parsed.public_inputs[0];
      return {
        commitment,
        proof: hexToFixed(parsed.proof, PROOF_LEN),
        publicInputs: parsed.public_inputs,
      };
    } finally {
      fs.rmSync(out, { force: true });
    }
  }

  async unshieldProof(input: {
    spendSk: string;
    k: string;
    v: bigint;
    index: number;
    leaves: string[];
    recipientField: string;
    amount: bigint;
    changeK: string;
  }): Promise<UnshieldProofResult> {
    if (!fs.existsSync(this.unshieldPk())) {
      throw new Error(
        `Missing ${this.unshieldPk()}. Unshield requires the unshield proving key.`,
      );
    }
    const out = this.tempFile('unshield-proof.json');
    const leavesPath = this.tempFile('leaves.txt');
    try {
      fs.writeFileSync(
        leavesPath,
        input.leaves.map((leaf) => leaf.trim()).join('\n') + '\n',
      );
      const { stdout } = await this.run([
        'unshield-proof',
        '--pk',
        this.unshieldPk(),
        '--spend-sk',
        input.spendSk,
        '--k',
        input.k,
        '--v',
        input.v.toString(),
        '--index',
        String(input.index),
        '--leaves',
        leavesPath,
        '--recipient-field',
        input.recipientField,
        '--amount',
        input.amount.toString(),
        '--change-k',
        input.changeK,
        '--depth',
        String(MERKLE_DEPTH),
        '--out',
        out,
      ]);
      const parsed = this.readProof(out);
      const find = (label: string, fallback: string) =>
        stdout
          .split('\n')
          .find((line) => line.startsWith(label))
          ?.slice(label.length)
          .trim() ?? fallback;
      return {
        root: find('root       ', parsed.public_inputs[0]),
        nullifier: parsed.public_inputs[1],
        changeCm: find('change_cm  ', parsed.public_inputs[4]),
        proof: hexToFixed(parsed.proof, PROOF_LEN),
        publicInputs: parsed.public_inputs,
      };
    } finally {
      fs.rmSync(out, { force: true });
      fs.rmSync(leavesPath, { force: true });
    }
  }

  private readProof(file: string): ProofJson {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as ProofJson;
    if (!parsed.proof || !Array.isArray(parsed.public_inputs)) {
      throw new Error(`malformed proof json at ${file}`);
    }
    return parsed;
  }

  private tempFile(name: string): string {
    return path.join(
      os.tmpdir(),
      `hypertron-${Date.now()}-${Math.random().toString(16).slice(2)}-${name}`,
    );
  }

  private async run(
    args: string[],
  ): Promise<{ stdout: string; stderr: string }> {
    this.logger.debug(`${this.bin()} ${args.join(' ')}`);
    try {
      return await execFileAsync(this.bin(), args, {
        timeout: 180_000,
        maxBuffer: 16 * 1024 * 1024,
      });
    } catch (error) {
      const err = error as { stderr?: string; message?: string };
      throw new Error(
        `hypertron-prove ${args[0]} failed: ${err.stderr || err.message || String(error)}`,
      );
    }
  }
}

export function pubkeyToFrHex(pubkey: Uint8Array): string {
  return `0x${Buffer.from(pubkey).toString('hex')}`;
}

export function spendSkBytes(hex: string): string {
  const body = hex.trim();
  if (!body) {
    throw new Error('POOL_SPEND_SK is empty');
  }
  hexToBytes(body.startsWith('0x') ? body : `0x${body}`);
  return body.startsWith('0x') ? body : `0x${body}`;
}
