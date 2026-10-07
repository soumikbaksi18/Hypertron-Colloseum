import { ApiError } from './http';
import { bytesToBase64, getPhantom, type PhantomProvider } from './phantom';
import { sessionApi, type AuthChallenge, type WalletSession } from './session';

export const PHANTOM_INSTALL_URL = 'https://phantom.app/download';

export type PhantomSignInResult =
  | { ok: true; session: WalletSession }
  | { ok: false; error: string; needsInstall?: boolean };

type SignInInput = AuthChallenge['signIn'];

function walletError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  const message = readMessage(err);
  const code = readCode(err);
  if (code === 4001 || /reject|declin|cancel/i.test(message)) {
    return 'Phantom request was declined.';
  }
  if (code === -32000) {
    return 'Phantom rejected the sign-in. Reload the page and try again.';
  }
  if (code === -32603 || message === 'Unexpected error') {
    return 'Phantom could not open the sign-in. Unlock the wallet and try a standard account. Ledger accounts often cannot sign this prompt.';
  }
  return message || fallback;
}

function readMessage(err: unknown): string {
  if (err instanceof Error) return err.message.trim();
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
    return err.message.trim();
  }
  return '';
}

function readCode(err: unknown): number | undefined {
  if (err && typeof err === 'object' && 'code' in err && typeof err.code === 'number') {
    return err.code;
  }
  return undefined;
}

function asBytes(value: unknown): Uint8Array | null {
  if (value instanceof Uint8Array) return value;
  if (typeof value === 'string') {
    if (value.includes('wants you to sign in')) return new TextEncoder().encode(value);
    try {
      const binary = atob(value);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      return bytes;
    } catch {
      return null;
    }
  }
  if (value && typeof value === 'object' && 'length' in value) {
    const record = value as Record<string, unknown>;
    const length = record.length;
    if (typeof length !== 'number') return null;
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i += 1) {
      const byte = record[i];
      if (typeof byte !== 'number') return null;
      bytes[i] = byte;
    }
    return bytes;
  }
  return null;
}

function createSignInMessageText(input: SignInInput & { address: string }): string {
  let message = `${input.domain} wants you to sign in with your Solana account:\n${input.address}`;
  if (input.statement) message += `\n\n${input.statement}`;
  const fields = [
    input.uri ? `URI: ${input.uri}` : '',
    input.version ? `Version: ${input.version}` : '',
    input.nonce ? `Nonce: ${input.nonce}` : '',
    input.issuedAt ? `Issued At: ${input.issuedAt}` : '',
  ].filter(Boolean);
  if (fields.length) message += `\n\n${fields.join('\n')}`;
  return message;
}

function readSignInResult(result: unknown) {
  const output = Array.isArray(result) ? result[0] : result;
  if (!output || typeof output !== 'object') {
    throw new Error('Phantom did not return a sign-in.');
  }
  const record = output as Record<string, unknown>;
  const signedMessage = asBytes(record.signedMessage);
  const signature = asBytes(record.signature);
  if (!signedMessage || !signature || signature.length !== 64) {
    throw new Error('Phantom did not return a sign-in signature.');
  }

  const account = record.account as { address?: string } | undefined;
  const publicKeyField = record.publicKey as { toBase58?: () => string } | undefined;
  const publicKey =
    (typeof record.address === 'string' ? record.address : undefined) ??
    account?.address ??
    publicKeyField?.toBase58?.() ??
    new TextDecoder().decode(signedMessage).split('\n')[1]?.trim();

  if (!publicKey) throw new Error('Phantom did not return a Solana address.');
  return { publicKey, signature, signedMessage };
}

async function requestPhantomSignature(phantom: PhantomProvider, input: SignInInput) {
  if (typeof phantom.signIn === 'function') {
    return readSignInResult(
      await phantom.signIn({
        domain: input.domain,
        statement: input.statement,
        uri: input.uri,
        version: input.version,
        nonce: input.nonce,
        issuedAt: input.issuedAt,
      }),
    );
  }

  const connected = await phantom.connect();
  const publicKey = connected.publicKey.toBase58();
  const message = createSignInMessageText({ ...input, address: publicKey });
  const signedMessage = new TextEncoder().encode(message);
  const signed = await phantom.signMessage(signedMessage);
  const signature = signed instanceof Uint8Array ? signed : signed.signature;
  if (!(signature instanceof Uint8Array) || signature.length !== 64) {
    throw new Error('Phantom did not return a sign-in signature.');
  }
  return { publicKey, signature, signedMessage };
}

/**
 * One Phantom prompt. connect() then signMessage() opens a second popup after
 * the click is spent, and Phantom answers that with "Unexpected error".
 */
export async function runPhantomSignInFlow(
  onStatus?: (message: string) => void,
): Promise<PhantomSignInResult> {
  onStatus?.('Connecting…');

  const phantom = getPhantom();
  if (!phantom) {
    return {
      ok: false,
      error: 'Install the Phantom browser extension to continue.',
      needsInstall: true,
    };
  }

  onStatus?.('Requesting challenge…');
  let challenge: AuthChallenge;
  try {
    challenge = await sessionApi.challenge({
      domain: window.location.host,
      uri: window.location.origin,
    });
  } catch (err) {
    return {
      ok: false,
      error: walletError(err, 'Could not request a sign-in challenge.'),
    };
  }

  onStatus?.('Sign in Phantom…');
  let signed: Awaited<ReturnType<typeof requestPhantomSignature>>;
  try {
    signed = await requestPhantomSignature(phantom, challenge.signIn);
  } catch (err) {
    return { ok: false, error: walletError(err, 'Signing failed.') };
  }

  onStatus?.('Verifying…');
  try {
    const session = await sessionApi.verify({
      publicKey: signed.publicKey,
      challengeId: challenge.challengeId,
      signature: bytesToBase64(signed.signature),
      signedMessage: bytesToBase64(signed.signedMessage),
    });
    return { ok: true, session };
  } catch (err) {
    return {
      ok: false,
      error: walletError(err, 'Could not verify the signature.'),
    };
  }
}
