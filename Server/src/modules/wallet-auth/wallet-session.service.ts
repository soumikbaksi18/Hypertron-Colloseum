import { Injectable } from '@nestjs/common';
import * as crypto from 'node:crypto';
import * as nacl from 'tweetnacl';
import bs58 from 'bs58';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { publicId } from '../../common/utils/crypto.util';
import {
  AuthenticationException,
  InvalidRequestException,
  ResourceNotFoundException,
} from '../../common/exceptions/hypertron.exception';
import { BusinessContext } from './business-context';

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const USDC = (whole: number) => BigInt(whole) * 1_000_000n;

export const SESSION_COOKIE = 'ht_dashboard';

@Injectable()
export class WalletSessionService {
  constructor(private readonly prisma: PrismaService) {}

  async issueChallenge(publicKey: string) {
    this.assertPubkey(publicKey);
    const nonce = crypto.randomBytes(16).toString('hex');
    const issuedAt = new Date().toISOString();
    const message = [
      'Hypertron wants you to sign in.',
      '',
      `Public Key: ${publicKey}`,
      `Nonce: ${nonce}`,
      `Issued At: ${issuedAt}`,
    ].join('\n');

    const challenge = await this.prisma.authChallenge.create({
      data: {
        publicKey,
        nonce,
        message,
        expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
      },
    });

    return {
      challengeId: challenge.id,
      message: challenge.message,
      expiresAt: challenge.expiresAt.toISOString(),
    };
  }

  async verify(
    publicKey: string,
    challengeId: string,
    signatureB64: string,
  ): Promise<{ token: string; business: BusinessContext }> {
    this.assertPubkey(publicKey);

    const challenge = await this.prisma.authChallenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge || challenge.publicKey !== publicKey) {
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

    if (!this.verifyEd25519(challenge.message, signatureB64, publicKey)) {
      throw new AuthenticationException(
        'Wallet signature did not match this challenge.',
        'invalid_signature',
      );
    }

    await this.prisma.authChallenge.delete({ where: { id: challenge.id } }).catch(() => undefined);

    const business = await this.ensureHandle(await this.upsertBusiness(publicKey));
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
    return this.ensureHandle(this.toContext(session.business));
  }

  async revoke(token: string | undefined): Promise<void> {
    if (!token) return;
    await this.prisma.dashboardSession
      .deleteMany({ where: { tokenHash: this.hashToken(token) } })
      .catch(() => undefined);
  }

  async updateMe(
    businessId: string,
    input: {
      name?: string;
      payoutAddress?: string;
      viewPub?: string;
      ownerPk?: string;
    },
  ): Promise<BusinessContext> {
    if (input.payoutAddress) this.assertPubkey(input.payoutAddress);
    const updated = await this.prisma.business.update({
      where: { id: businessId },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() || 'Untitled business' } : {}),
        ...(input.payoutAddress !== undefined ? { payoutAddress: input.payoutAddress } : {}),
        ...(input.viewPub !== undefined ? { viewPub: input.viewPub.trim() || null } : {}),
        ...(input.ownerPk !== undefined ? { ownerPk: input.ownerPk.trim() || null } : {}),
      },
    });
    return this.ensureHandle(this.toContext(updated));
  }

  cookieMaxAge(): number {
    return SESSION_TTL_MS;
  }

  private async upsertBusiness(walletPubkey: string): Promise<BusinessContext> {
    const existing = await this.prisma.business.findUnique({
      where: { walletPubkey },
    });
    if (existing) {
      return this.ensureHandle(this.toContext(existing));
    }

    const created = await this.prisma.business.create({
      data: {
        name: 'Untitled business',
        handle: await this.allocateHandle(),
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

  async lookupHandle(handle: string) {
    const normalized = handle.trim().toLowerCase();
    if (!normalized) {
      throw new InvalidRequestException('invalid_handle', 'Missing Hypertron ID.');
    }
    const business = await this.prisma.business.findFirst({
      where: { handle: { equals: normalized, mode: 'insensitive' } },
      select: { handle: true, name: true, ownerPk: true, viewPub: true },
    });
    if (!business?.handle || !business.ownerPk || !business.viewPub) {
      throw new ResourceNotFoundException('No Hypertron user published keys for that ID.');
    }
    return {
      handle: business.handle,
      name: business.name,
      owner_pk: business.ownerPk,
      view_pub: business.viewPub,
    };
  }

  private async allocateHandle(): Promise<string> {
    for (let i = 0; i < 8; i += 1) {
      const handle = `ht_${crypto.randomBytes(4).toString('hex')}`;
      const taken = await this.prisma.business.findUnique({ where: { handle } });
      if (!taken) return handle;
    }
    return publicId('ht').slice(0, 16);
  }

  private async ensureHandle(business: BusinessContext): Promise<BusinessContext> {
    if (business.handle) return business;
    const handle = await this.allocateHandle();
    const updated = await this.prisma.business.update({
      where: { id: business.businessId },
      data: { handle },
    });
    return this.toContext(updated);
  }

  private toContext(business: {
    id: string;
    name: string;
    handle?: string | null;
    walletPubkey: string | null;
    payoutAddress: string | null;
    viewPub?: string | null;
    ownerPk?: string | null;
  }): BusinessContext {
    return {
      businessId: business.id,
      walletPubkey: business.walletPubkey ?? '',
      name: business.name,
      handle: business.handle ?? null,
      payoutAddress: business.payoutAddress,
      viewPub: business.viewPub ?? null,
      ownerPk: business.ownerPk ?? null,
    };
  }

  private verifyEd25519(message: string, signatureB64: string, publicKey: string): boolean {
    try {
      const sig = Buffer.from(signatureB64, 'base64');
      const pub = bs58.decode(publicKey);
      const msg = Buffer.from(message, 'utf8');
      if (sig.length !== 64 || pub.length !== 32) return false;
      return nacl.sign.detached.verify(msg, sig, pub);
    } catch {
      return false;
    }
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
