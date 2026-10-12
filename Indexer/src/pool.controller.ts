import { Controller, Get, Param, Query } from '@nestjs/common';

import { IngestService } from './ingest.service';

@Controller('v1/pool')
export class PoolController {
  constructor(private readonly ingest: IngestService) {}

  @Get(':network/leaves')
  getLeaves(@Param('network') _network: string, @Query('since') since?: string) {
    const from = Number(since ?? 0) || 0;
    const rows = this.ingest.snapshot().commitments.filter(
      (row) => row.leafIndex >= from,
    );
    const last = rows[rows.length - 1];
    return {
      leaves: rows.map((row) => row.leaf),
      size: this.ingest.snapshot().commitments.length,
      root: last?.root ?? '',
    };
  }

  @Get(':network/blobs')
  getBlobs(@Param('network') _network: string, @Query('since') since?: string) {
    const from = Number(since ?? 0) || 0;
    const blobs = this.ingest
      .snapshot()
      .blobs.filter((row) => row.ledger >= from);
    return { blobs };
  }

  @Get(':network/nullifiers')
  getNullifiers(@Param('network') _network: string) {
    return { nullifiers: this.ingest.snapshot().nullifiers };
  }

  @Get(':network/status')
  getStatus(@Param('network') _network: string) {
    const snap = this.ingest.snapshot();
    const last = snap.commitments[snap.commitments.length - 1];
    return {
      lastLedger: snap.lastSlot,
      size: snap.commitments.length,
      root: last?.root ?? '',
      healthy: snap.healthy,
    };
  }

  @Get(':network/commitments')
  getCommitments(
    @Param('network') _network: string,
    @Query('leaves') leaves?: string,
  ) {
    const want = new Set(
      (leaves ?? '')
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    );
    const commitments = this.ingest
      .snapshot()
      .commitments.filter((row) => want.has(row.leaf.toLowerCase()))
      .map((row) => ({
        leaf: row.leaf,
        leafIndex: row.leafIndex,
        ledger: row.slot,
        txHash: row.signature,
      }));
    return { commitments };
  }
}
