const KEY = 'hypertron.deposit_pending';

export type PendingDeposit = {
  pendingId: string;
  commitment: string;
  k: string;
  v: string;
  ownerPk: string;
  blob: string | null;
  txSignature: string | null;
  status: 'prepared' | 'submitted' | 'pending' | 'failed' | 'expired';
  createdAt: number;
};

function read(): PendingDeposit[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingDeposit[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(rows: PendingDeposit[]): void {
  localStorage.setItem(KEY, JSON.stringify(rows));
}

export function listPendingDeposits(): PendingDeposit[] {
  return read();
}

export function upsertPendingDeposit(row: PendingDeposit): void {
  const next = read().filter((item) => item.commitment !== row.commitment);
  next.push(row);
  write(next);
}

export function clearPendingDeposit(commitment: string): void {
  write(read().filter((item) => item.commitment !== commitment));
}

export function recoverableDeposits(): PendingDeposit[] {
  return read().filter(
    (row) => row.status === 'prepared' || row.status === 'submitted' || row.status === 'pending',
  );
}
