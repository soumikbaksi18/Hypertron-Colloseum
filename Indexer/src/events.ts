import { createHash } from 'node:crypto';

export type ParsedEvent =
  | { kind: 'CommitmentAdded'; index: number; leaf: string; root: string }
  | { kind: 'NullifierSpent'; nullifier: string }
  | { kind: 'NoteBlob'; index: number; blob: string }
  | {
      kind: 'PrivateTransfer';
      nullifier1: string;
      nullifier2: string;
      outCm1: string;
      outCm2: string;
      note1: string;
      note2: string;
    }
  | {
      kind: 'Withdrawn';
      nullifier: string;
      amount: string;
      recipient: string;
      changeCm: string;
    };

function disc(name: string): Buffer {
  return createHash('sha256').update(`event:${name}`).digest().subarray(0, 8);
}

const DISCS = {
  CommitmentAdded: disc('CommitmentAdded'),
  NullifierSpent: disc('NullifierSpent'),
  NoteBlob: disc('NoteBlob'),
  PrivateTransfer: disc('PrivateTransfer'),
  Withdrawn: disc('Withdrawn'),
};

function eq(a: Buffer, b: Buffer): boolean {
  return a.equals(b);
}

function hex32(buf: Buffer, offset: number): string {
  return `0x${buf.subarray(offset, offset + 32).toString('hex')}`;
}

function readVec(buf: Buffer, offset: number): { value: Buffer; next: number } {
  const len = buf.readUInt32LE(offset);
  const start = offset + 4;
  const end = start + len;
  return { value: buf.subarray(start, end), next: end };
}

export function parseProgramData(base64: string): ParsedEvent[] {
  const raw = Buffer.from(base64, 'base64');
  if (raw.length < 8) return [];
  const head = raw.subarray(0, 8);
  const body = raw.subarray(8);
  if (eq(head, DISCS.CommitmentAdded) && body.length >= 8 + 32 + 32) {
    return [
      {
        kind: 'CommitmentAdded',
        index: Number(body.readBigUInt64LE(0)),
        leaf: hex32(body, 8),
        root: hex32(body, 40),
      },
    ];
  }
  if (eq(head, DISCS.NullifierSpent) && body.length >= 32) {
    return [{ kind: 'NullifierSpent', nullifier: hex32(body, 0) }];
  }
  if (eq(head, DISCS.NoteBlob) && body.length >= 12) {
    const index = Number(body.readBigUInt64LE(0));
    const blob = readVec(body, 8);
    return [
      {
        kind: 'NoteBlob',
        index,
        blob: `0x${blob.value.toString('hex')}`,
      },
    ];
  }
  if (eq(head, DISCS.Withdrawn) && body.length >= 32 + 8 + 32 + 32) {
    return [
      {
        kind: 'Withdrawn',
        nullifier: hex32(body, 0),
        amount: body.readBigUInt64LE(32).toString(),
        recipient: hex32(body, 40),
        changeCm: hex32(body, 72),
      },
    ];
  }
  if (eq(head, DISCS.PrivateTransfer) && body.length >= 128) {
    let o = 0;
    const nullifier1 = hex32(body, o);
    o += 32;
    const nullifier2 = hex32(body, o);
    o += 32;
    const outCm1 = hex32(body, o);
    o += 32;
    const outCm2 = hex32(body, o);
    o += 32;
    const n1 = readVec(body, o);
    o = n1.next;
    const n2 = readVec(body, o);
    return [
      {
        kind: 'PrivateTransfer',
        nullifier1,
        nullifier2,
        outCm1,
        outCm2,
        note1: `0x${n1.value.toString('hex')}`,
        note2: `0x${n2.value.toString('hex')}`,
      },
    ];
  }
  return [];
}

export function eventsFromLogs(logs: string[] | null | undefined): ParsedEvent[] {
  const out: ParsedEvent[] = [];
  for (const line of logs ?? []) {
    const prefix = 'Program data: ';
    const idx = line.indexOf(prefix);
    if (idx < 0) continue;
    out.push(...parseProgramData(line.slice(idx + prefix.length).trim()));
  }
  return out;
}
