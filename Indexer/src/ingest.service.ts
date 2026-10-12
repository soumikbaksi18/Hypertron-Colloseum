import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Connection, PublicKey } from '@solana/web3.js';

import { eventsFromLogs } from './events';
import { loadState, saveState, type IndexerState } from './store';

const POLL_MS = 5_000;

@Injectable()
export class IngestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IngestService.name);
  private timer: ReturnType<typeof setInterval> | undefined;
  private running = false;
  private state: IndexerState = loadState();

  snapshot(): IndexerState {
    return this.state;
  }

  onModuleInit(): void {
    this.timer = setInterval(() => void this.tick(), POLL_MS);
    setTimeout(() => void this.tick(), 1_000);
    this.logger.log(`ingest every ${POLL_MS}ms`);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private rpc(): Connection {
    const url = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';
    return new Connection(url, 'confirmed');
  }

  private programId(): string {
    return (
      process.env.POOL_PROGRAM_ID ??
      '9HQsgGDHgYw3N8PGnh9EWrUGRHgmp7tmdGaxuBHHA335'
    );
  }

  private async tick(): Promise<void> {
    if (this.running || !this.state.healthy) return;
    this.running = true;
    try {
      await this.ingest();
    } catch (error) {
      this.logger.error(`ingest failed: ${String(error)}`);
    } finally {
      this.running = false;
    }
  }

  private async ingest(): Promise<void> {
    const conn = this.rpc();
    const sigs = await conn.getSignaturesForAddress(
      new PublicKey(this.programId()),
      { limit: 50 },
    );
    if (sigs.length === 0) return;

    const chronological = [...sigs].reverse();
    for (const info of chronological) {
      if (info.slot < this.state.lastSlot) continue;
      if (
        info.slot === this.state.lastSlot &&
        info.signature === this.state.lastSignature
      ) {
        continue;
      }
      const tx = await conn.getTransaction(info.signature, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed',
      });
      const logs = tx?.meta?.logMessages ?? [];
      const parsed = eventsFromLogs(logs);
      for (const item of parsed) {
        if (item.kind === 'CommitmentAdded') {
          const expected = this.state.commitments.length;
          if (item.index !== expected) {
            this.logger.error(
              `contiguity break expected=${expected} got=${item.index} — pausing`,
            );
            this.state.healthy = false;
            saveState(this.state);
            return;
          }
          this.state.commitments.push({
            leafIndex: item.index,
            leaf: item.leaf,
            root: item.root,
            slot: info.slot,
            signature: info.signature,
          });
        } else if (item.kind === 'NullifierSpent') {
          if (!this.state.nullifiers.includes(item.nullifier)) {
            this.state.nullifiers.push(item.nullifier);
          }
        } else if (item.kind === 'NoteBlob') {
          this.state.blobs.push({
            leafIndex: item.index,
            blob: item.blob,
            ledger: info.slot,
            signature: info.signature,
          });
        } else if (item.kind === 'PrivateTransfer') {
          if (!this.state.nullifiers.includes(item.nullifier1)) {
            this.state.nullifiers.push(item.nullifier1);
          }
          if (!this.state.nullifiers.includes(item.nullifier2)) {
            this.state.nullifiers.push(item.nullifier2);
          }
          if (item.note1 && item.note1 !== '0x') {
            this.state.blobs.push({
              leafIndex: null,
              blob: item.note1,
              ledger: info.slot,
              signature: info.signature,
            });
          }
          if (item.note2 && item.note2 !== '0x') {
            this.state.blobs.push({
              leafIndex: null,
              blob: item.note2,
              ledger: info.slot,
              signature: info.signature,
            });
          }
        } else if (item.kind === 'Withdrawn') {
          if (!this.state.nullifiers.includes(item.nullifier)) {
            this.state.nullifiers.push(item.nullifier);
          }
        }
      }
      this.state.lastSignature = info.signature;
      this.state.lastSlot = info.slot;
    }
    saveState(this.state);
  }
}
