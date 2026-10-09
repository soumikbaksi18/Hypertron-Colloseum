const SPEND = 'hypertron.spend_sk';
const VIEW_SECRET = 'hypertron.view_secret';
const VIEW_PUB = 'hypertron.view_pub';
const OWNER_PK = 'hypertron.owner_pk';

export type ShieldKeys = {
  spendSk: string;
  viewSecret: string;
  viewPub: string;
  ownerPk: string;
};

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  localStorage.setItem(key, value);
}

export function loadShieldKeys(): ShieldKeys | null {
  const spendSk = read(SPEND);
  const viewSecret = read(VIEW_SECRET);
  const viewPub = read(VIEW_PUB);
  const ownerPk = read(OWNER_PK);
  if (!spendSk || !viewSecret || !viewPub || !ownerPk) return null;
  return { spendSk, viewSecret, viewPub, ownerPk };
}

export function saveShieldKeys(keys: ShieldKeys): void {
  write(SPEND, keys.spendSk);
  write(VIEW_SECRET, keys.viewSecret);
  write(VIEW_PUB, keys.viewPub);
  write(OWNER_PK, keys.ownerPk);
}

export function parseShieldBackup(raw: string): ShieldKeys {
  const parsed = JSON.parse(raw) as Partial<ShieldKeys> & {
    spend_sk?: string;
    view_secret?: string;
    view_pub?: string;
    owner_pk?: string;
  };
  const keys = {
    spendSk: parsed.spendSk ?? parsed.spend_sk ?? '',
    viewSecret: parsed.viewSecret ?? parsed.view_secret ?? '',
    viewPub: parsed.viewPub ?? parsed.view_pub ?? '',
    ownerPk: parsed.ownerPk ?? parsed.owner_pk ?? '',
  };
  if (!keys.spendSk || !keys.viewSecret || !keys.viewPub || !keys.ownerPk) {
    throw new Error('This file is not a Hypertron shield-keys backup.');
  }
  return keys;
}

export function downloadShieldBackup(keys: ShieldKeys): void {
  const blob = new Blob([JSON.stringify(keys, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'hypertron-shield-keys.json';
  a.click();
  URL.revokeObjectURL(url);
}

export function randomFrHex(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}
