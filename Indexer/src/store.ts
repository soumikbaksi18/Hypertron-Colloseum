import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export type CommitmentRow = {
  leafIndex: number;
  leaf: string;
  root: string;
  slot: number;
  signature: string;
};

export type BlobRow = {
  leafIndex: number | null;
  blob: string;
  ledger: number;
  signature: string;
};

export type IndexerState = {
  lastSignature: string | null;
  lastSlot: number;
  healthy: boolean;
  commitments: CommitmentRow[];
  nullifiers: string[];
  blobs: BlobRow[];
};

const FILE = join(
  process.env.INDEXER_DATA_DIR?.trim() || join(__dirname, '..', 'data'),
  'state.json',
);

function empty(): IndexerState {
  return {
    lastSignature: null,
    lastSlot: 0,
    healthy: true,
    commitments: [],
    nullifiers: [],
    blobs: [],
  };
}

export function loadState(): IndexerState {
  try {
    if (!existsSync(FILE)) return empty();
    return JSON.parse(readFileSync(FILE, 'utf8')) as IndexerState;
  } catch {
    return empty();
  }
}

export function saveState(state: IndexerState): void {
  mkdirSync(dirname(FILE), { recursive: true });
  writeFileSync(FILE, JSON.stringify(state, null, 2));
}
