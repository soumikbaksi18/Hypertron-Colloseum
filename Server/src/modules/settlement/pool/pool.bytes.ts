import { randomBytes } from 'node:crypto';

export function strip0x(hex: string): string {
  const trimmed = hex.trim();
  return trimmed.startsWith('0x') || trimmed.startsWith('0X')
    ? trimmed.slice(2)
    : trimmed;
}

export function hexToBytes(hex: string): Buffer {
  const body = strip0x(hex);
  if (body.length % 2 !== 0) {
    throw new Error(`odd-length hex: ${hex}`);
  }
  return Buffer.from(body, 'hex');
}

export function bytesToHex(bytes: Uint8Array): string {
  return `0x${Buffer.from(bytes).toString('hex')}`;
}

export function hexToFixed(hex: string, length: number): Buffer {
  const bytes = hexToBytes(hex);
  if (bytes.length !== length) {
    throw new Error(`expected ${length} bytes, got ${bytes.length}`);
  }
  return bytes;
}

export function randomFrHex(): string {
  return bytesToHex(randomBytes(32));
}

export function encodeU32Le(value: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(value);
  return buf;
}

export function encodeU64Le(value: bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(value);
  return buf;
}

export function encodeVecU8(bytes: Buffer): Buffer {
  return Buffer.concat([encodeU32Le(bytes.length), bytes]);
}
