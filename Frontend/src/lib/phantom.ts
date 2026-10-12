export type PhantomProvider = {
  isPhantom?: boolean;
  publicKey?: { toBase58(): string };
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{
    publicKey: { toBase58(): string };
  }>;
  disconnect: () => Promise<void>;
  signIn?: (input: {
    domain: string;
    statement?: string;
    uri?: string;
    version?: string;
    nonce?: string;
    issuedAt?: string;
    address?: string;
  }) => Promise<unknown>;
  signMessage: (
    message: Uint8Array,
    encoding?: string,
  ) => Promise<{ signature: Uint8Array } | Uint8Array>;
  signAndSendTransaction: (transaction: unknown) => Promise<{
    signature: string;
  }>;
  signTransaction: (transaction: unknown) => Promise<{
    serialize: () => Uint8Array;
  }>;
};

declare global {
  interface Window {
    solana?: PhantomProvider;
    phantom?: { solana?: PhantomProvider };
  }
}

export function getPhantom(): PhantomProvider | null {
  const provider = window.phantom?.solana ?? window.solana;
  if (provider?.isPhantom) return provider;
  return null;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function shortenAddress(address: string, size = 4): string {
  if (address.length <= size * 2 + 3) return address;
  return `${address.slice(0, size)}…${address.slice(-size)}`;
}
