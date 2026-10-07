import { Injectable } from '@nestjs/common';
import * as crypto from 'node:crypto';
import * as nacl from 'tweetnacl';
import bs58 from 'bs58';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { publicId } from '../../common/utils/crypto.util';
import {
  AuthenticationException,
  InvalidRequestException,
} from '../../common/exceptions/hypertron.exception';
import { BusinessContext } from './business-context';
import {
  createSignInMessageText,
  parseSignInMessageText,
  type StoredSignIn,
} from './siws-message';

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SIGN_IN_STATEMENT =
  'Sign in to Hypertron. This does not send a transaction or cost a fee.';
const USDC = (whole: number) => BigInt(whole) * 1_000_000n;

export const SESSION_COOKIE = 'ht_dashboard';

@Injectable()
export class WalletSessionService {
  constructor(private readonly prisma: PrismaService) {}

  async issueChallenge(input: {
    publicKey?: string;
    domain: string;
    uri: string;
    originHeader?: string;
  }) {
    if (input.publicKey) this.assertPubkey(input.publicKey);
    const target = this.resolveSignInTarget(input.domain, input.uri, input.originHeader);
    const nonce = crypto.randomBytes(16).toString('hex');
    const issuedAt = new Date().toISOString();
    const stored: StoredSignIn = {
      v: 1,
      domain: target.domain,
      statement: SIGN_IN_STATEMENT,
      uri: target.uri,
      version: '1',
      nonce,
      issuedAt,
    };

    const challenge = await this.prisma.authChallenge.create({
      data: {
        publicKey: input.publicKey ?? '',
        nonce,
        message: JSON.stringify(stored),
        expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
      },
    });

    return {
      challengeId: challenge.id,
      message: SIGN_IN_STATEMENT,
      expiresAt: challenge.expiresAt.toISOString(),
      signIn: {
        domain: stored.domain,
        statement: stored.statement,
        uri: stored.uri,
        version: stored.version,
        nonce: stored.nonce,
        issuedAt: stored.issuedAt,
      },
    };
  }

  async verify(
    publicKey: string,
    challengeId: string,
    signatureB64: string,
    signedMessageB64: string,
  ): Promise<{ token: string; business: BusinessContext }> {
    this.assertPubkey(publicKey);

    const challenge = await this.prisma.authChallenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge || (challenge.publicKey && challenge.publicKey !== publicKey)) {
      throw new AuthenticationException(
        'Unknown or expired sign-in challenge.',
        'invalid_challenge',
      );
    }

    if (challenge.expiresAt.getTime() < Date.now()) {
      await this.prisma.authChallenge.delete({ where: { id: challenge.id } }).catch(() => undefined);
      throw new AuthenticationException(
        'Sign-in challenge expired. Request a new one.',
        'challenge_expired',
      );
    }

    const stored = this.readStoredSignIn(challenge.message);
    if (!stored || stored.nonce !== challenge.nonce) {
      throw new AuthenticationException(
        'Unknown or expired sign-in challenge.',
        'invalid_challenge',
      );
    }

    const signedBytes = Buffer.from(signedMessageB64, 'base64');
    const signedText = signedBytes.toString('utf8');
    const parsed = parseSignInMessageText(signedText);
    const expected = createSignInMessageText({ ...stored, address: publicKey });
    const sameMessage =
      parsed !== null &&
      parsed.domain === stored.domain &&
      parsed.address === publicKey &&
      parsed.statement === stored.statement &&
      parsed.uri === stored.uri &&
      parsed.version === stored.version &&
      parsed.nonce === stored.nonce &&
      parsed.issuedAt === stored.issuedAt &&
      !parsed.chainId &&
      signedText.replace(/\n+$/, '') === expected;

    if (!sameMessage || !this.verifyEd25519Bytes(signedBytes, signatureB64, publicKey)) {
      throw new AuthenticationException(
        'Wallet signature did not match this challenge.',
        'invalid_signature',
      );
    }

    await this.prisma.authChallenge.delete({ where: { id: challenge.id } }).catch(() => undefined);

    const business = await this.upsertBusiness(publicKey);
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);

    await this.prisma.dashboardSession.create({
      data: {
        tokenHash,
        businessId: business.businessId,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      },
    });

    return { token, business };
  }

  async resolve(token: string | undefined): Promise<BusinessContext | null> {
    if (!token) return null;
    const session = await this.prisma.dashboardSession.findUnique({
      where: { tokenHash: this.hashToken(token) },
      include: { business: true },
    });
    if (!session || session.expiresAt.getTime() < Date.now()) {
      if (session) {
        await this.prisma.dashboardSession.delete({ where: { id: session.id } }).catch(() => undefined);
      }
      return null;
    }
    return this.toContext(session.business);
  }

  async revoke(token: string | undefined): Promise<void> {
    if (!token) return;
    await this.prisma.dashboardSession
      .deleteMany({ where: { tokenHash: this.hashToken(token) } })
      .catch(() => undefined);
  }

  async updateMe(
    businessId: string,
    input: { name?: string; payoutAddress?: string },
  ): Promise<BusinessContext> {
    if (input.payoutAddress) this.assertPubkey(input.payoutAddress);
    const updated = await this.prisma.business.update({
      where: { id: businessId },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() || 'Untitled business' } : {}),
        ...(input.payoutAddress !== undefined ? { payoutAddress: input.payoutAddress } : {}),
      },
    });
    return this.toContext(updated);
  }

  cookieMaxAge(): number {
    return SESSION_TTL_MS;
  }

  private async upsertBusiness(walletPubkey: string): Promise<BusinessContext> {
    const existing = await this.prisma.business.findUnique({
      where: { walletPubkey },
    });
    if (existing) {
      return this.toContext(existing);
    }

    const created = await this.prisma.business.create({
      data: {
        name: 'Untitled business',
        walletPubkey,
        payoutAddress: walletPubkey,
        agents: {
          create: {
            publicId: publicId('agt'),
            label: 'workspace-agent',
            currency: 'USDC',
            perTxLimitMinor: USDC(5_000),
            dailyLimitMinor: USDC(20_000),
            autoApproveLimitMinor: USDC(1_000),
          },
        },
        allowedPayees: {
          create: [
            { payeeRef: 'supplier_acme', label: 'Acme Industrial Supply' },
            { payeeRef: 'supplier_globex', label: 'Globex Logistics' },
          ],
        },
        webhookEndpoints: {
          create: {
            publicId: publicId('whe'),
            url: `http://localhost:${process.env.PORT ?? 4000}/dev/webhook-sink`,
            signingSecret: crypto.randomBytes(32).toString('hex'),
            events: [],
          },
        },
      },
    });

    return this.toContext(created);
  }

  private toContext(business: {
    id: string;
    name: string;
    walletPubkey: string | null;
    payoutAddress: string | null;
  }): BusinessContext {
    return {
      businessId: business.id,
      walletPubkey: business.walletPubkey ?? '',
      name: business.name,
      payoutAddress: business.payoutAddress,
    };
  }

  private verifyEd25519Bytes(
    message: Uint8Array,
    signatureB64: string,
    publicKey: string,
  ): boolean {
    try {
      const sig = Buffer.from(signatureB64, 'base64');
      const pub = bs58.decode(publicKey);
      if (sig.length !== 64 || pub.length !== 32) return false;
      return nacl.sign.detached.verify(message, sig, pub);
    } catch {
      return false;
    }
  }

  private readStoredSignIn(message: string): StoredSignIn | null {
    try {
      const parsed = JSON.parse(message) as StoredSignIn;
      if (parsed?.v !== 1 || !parsed.domain || !parsed.nonce || !parsed.issuedAt) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  private resolveSignInTarget(domain: string, uri: string, originHeader?: string) {
    let parsed: URL;
    try {
      parsed = new URL(uri);
    } catch {
      throw new InvalidRequestException(
        'invalid_sign_in_uri',
        'Sign-in URI is not a valid URL.',
        'uri',
      );
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new InvalidRequestException(
        'invalid_sign_in_uri',
        'Sign-in URI must be http or https.',
        'uri',
      );
    }
    if (parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') {
      throw new InvalidRequestException(
        'invalid_sign_in_uri',
        'Sign-in URI must be the site origin.',
        'uri',
      );
    }
    if (parsed.host !== domain) {
      throw new InvalidRequestException(
        'invalid_sign_in_domain',
        'Sign-in domain must match the site host.',
        'domain',
      );
    }

    if (originHeader) {
      let origin: URL;
      try {
        origin = new URL(originHeader);
      } catch {
        throw new InvalidRequestException(
          'invalid_sign_in_origin',
          'Request origin is not valid.',
          'uri',
        );
      }
      if (origin.origin !== parsed.origin) {
        throw new InvalidRequestException(
          'invalid_sign_in_origin',
          'Sign-in origin does not match this page.',
          'uri',
        );
      }
    }

    return { domain: parsed.host, uri: parsed.origin };
  }

  private assertPubkey(value: string): void {
    try {
      const bytes = bs58.decode(value);
      if (bytes.length !== 32) {
        throw new Error('bad length');
      }
    } catch {
      throw new InvalidRequestException(
        'invalid_public_key',
        'Expected a Solana base58 public key.',
        'publicKey',
      );
    }
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
