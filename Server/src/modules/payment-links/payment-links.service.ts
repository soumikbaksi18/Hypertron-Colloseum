import { Injectable, Logger } from '@nestjs/common';
import { PaymentLink, PaymentLinkStatus } from '@prisma/client';
import { PublicKey } from '@solana/web3.js';

import { loadConfig, poolSettlementEnabled } from '../../common/config/configuration';
import {
  HypertronException,
  InvalidRequestException,
  ResourceNotFoundException,
  StateTransitionException,
} from '../../common/exceptions/hypertron.exception';
import { publicId } from '../../common/utils/crypto.util';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { SolanaPoolSettlementProvider } from '../settlement/solana-pool.provider';
import { BusinessContext } from '../wallet-auth/business-context';

@Injectable()
export class PaymentLinksService {
  private readonly logger = new Logger(PaymentLinksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pool: SolanaPoolSettlementProvider,
  ) {}

  async create(business: BusinessContext, input: {
    amount_minor: number;
    currency?: string;
    purpose?: string;
    client_name?: string;
    memo?: string;
    expires_at?: string;
  }) {
    const destination = business.payoutAddress ?? business.walletPubkey;
    if (!destination) {
      throw new InvalidRequestException(
        'missing_payout_address',
        'Set a payout address in Settings before creating an invoice.',
      );
    }

    const expiresAt = input.expires_at ? new Date(input.expires_at) : null;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      throw new InvalidRequestException('invalid_expires_at', 'expires_at must be an ISO date.', 'expires_at');
    }

    const created = await this.prisma.paymentLink.create({
      data: {
        publicId: publicId('pl'),
        businessId: business.businessId,
        amountMinor: BigInt(input.amount_minor),
        currency: (input.currency ?? 'USDC').toUpperCase(),
        purpose: input.purpose?.trim() || null,
        clientName: input.client_name?.trim() || null,
        memo: input.memo?.trim() || null,
        destinationAddress: destination,
        expiresAt,
      },
    });

    return this.toMerchant(created, business.name);
  }

  async list(businessId: string, businessName: string) {
    const rows = await this.prisma.paymentLink.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const notes =
      rows.length === 0
        ? []
        : await this.prisma.poolNote.findMany({
            where: { paymentLinkId: { in: rows.map((row) => row.publicId) } },
          });
    const open = new Set(
      notes.filter((note) => !note.spent).map((note) => note.paymentLinkId),
    );
    return rows.map((row) =>
      this.toMerchant(row, businessName, open.has(row.publicId)),
    );
  }

  async getPublic(publicIdValue: string) {
    const row = await this.prisma.paymentLink.findUnique({
      where: { publicId: publicIdValue },
      include: { business: { select: { name: true } } },
    });
    if (!row) {
      throw new ResourceNotFoundException('Payment link not found.');
    }
    return this.toPublic(row, row.business.name);
  }

  async prepareShield(
    publicIdValue: string,
    payerPubkey: string,
  ): Promise<{ transaction: string; commitment: string; rail: 'pool' }> {
    if (!poolSettlementEnabled()) {
      throw new InvalidRequestException(
        'pool_disabled',
        'Shielded checkout is off. Set SETTLEMENT_PROVIDER=pool.',
      );
    }
    try {
      new PublicKey(payerPubkey);
    } catch {
      throw new InvalidRequestException(
        'invalid_payer',
        'payer_pubkey must be a Solana address.',
        'payer_pubkey',
      );
    }

    const row = await this.prisma.paymentLink.findUnique({
      where: { publicId: publicIdValue },
      include: { business: { select: { name: true, viewPub: true } } },
    });
    if (!row) {
      throw new ResourceNotFoundException('Payment link not found.');
    }
    const status = this.effectiveStatus(row);
    if (status !== 'pending') {
      throw new StateTransitionException('This invoice can no longer be paid.');
    }

    try {
      const prepared = await this.pool.prepareCustomerDeposit({
        paymentLinkId: row.publicId,
        payer: payerPubkey,
        amount: row.amountMinor,
        viewPub: row.business.viewPub,
      });
      return { ...prepared, rail: 'pool' };
    } catch (error) {
      if (error instanceof HypertronException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`prepare-shield ${row.publicId}: ${message}`);
      throw new InvalidRequestException('pool_prepare_failed', message);
    }
  }

  async broadcast(
    publicIdValue: string,
    input: { signed_transaction: string; payer_pubkey?: string },
  ) {
    if (!poolSettlementEnabled()) {
      throw new InvalidRequestException(
        'pool_disabled',
        'Shielded checkout is off. Set SETTLEMENT_PROVIDER=pool.',
      );
    }
    const row = await this.prisma.paymentLink.findUnique({
      where: { publicId: publicIdValue },
    });
    if (!row) {
      throw new ResourceNotFoundException('Payment link not found.');
    }
    const status = this.effectiveStatus(row);
    if (status === 'paid') {
      return this.getPublic(publicIdValue);
    }
    if (status !== 'pending') {
      throw new StateTransitionException('This invoice can no longer be paid.');
    }

    try {
      const txSignature = await this.pool.broadcastSignedDeposit(
        input.signed_transaction,
      );
      return this.confirm(publicIdValue, {
        tx_signature: txSignature,
        payer_pubkey: input.payer_pubkey,
      });
    } catch (error) {
      if (error instanceof HypertronException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`broadcast ${publicIdValue}: ${message}`);
      throw new InvalidRequestException('pool_broadcast_failed', message);
    }
  }

  async withdraw(
    business: BusinessContext,
    publicIdValue: string,
    destination: string,
  ) {
    if (!poolSettlementEnabled()) {
      throw new InvalidRequestException(
        'pool_disabled',
        'Shielded checkout is off. Set SETTLEMENT_PROVIDER=pool.',
      );
    }
    try {
      new PublicKey(destination);
    } catch {
      throw new InvalidRequestException(
        'invalid_destination',
        'destination must be a Solana address.',
        'destination',
      );
    }

    const row = await this.prisma.paymentLink.findUnique({
      where: { publicId: publicIdValue },
    });
    if (!row || row.businessId !== business.businessId) {
      throw new ResourceNotFoundException('Payment link not found.');
    }
    if (this.effectiveStatus(row) !== 'paid') {
      throw new StateTransitionException('Only paid invoices can be withdrawn.');
    }
    if (row.payoutTxSignature) {
      throw new StateTransitionException('This invoice was already withdrawn.');
    }

    try {
      const payoutTxSignature = await this.pool.unshieldInvoice(
        row.publicId,
        destination,
      );
      const updated = await this.prisma.paymentLink.update({
        where: { id: row.id },
        data: { payoutTxSignature },
      });
      return this.toMerchant(updated, business.name, false);
    } catch (error) {
      if (error instanceof HypertronException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`withdraw ${row.publicId}: ${message}`);
      throw new InvalidRequestException('pool_withdraw_failed', message);
    }
  }

  async confirm(
    publicIdValue: string,
    input: { tx_signature?: string; payer_pubkey?: string },
  ) {
    const row = await this.prisma.paymentLink.findUnique({
      where: { publicId: publicIdValue },
      include: {
        business: { select: { name: true, viewPub: true } },
      },
    });
    if (!row) {
      throw new ResourceNotFoundException('Payment link not found.');
    }

    const status = this.effectiveStatus(row);
    if (status === 'expired') {
      throw new StateTransitionException('This invoice has expired.');
    }
    if (status === 'paid') {
      return this.toPublic(row, row.business.name);
    }
    if (status !== 'pending') {
      throw new StateTransitionException('This invoice can no longer be paid.');
    }

    if (poolSettlementEnabled() && !input.tx_signature?.trim()) {
      throw new InvalidRequestException(
        'missing_tx',
        'Shielded checkout requires the deposit transaction signature.',
      );
    }

    const updated = await this.prisma.paymentLink.update({
      where: { id: row.id },
      data: {
        status: PaymentLinkStatus.paid,
        paidAt: new Date(),
        txSignature: input.tx_signature?.trim() || `demo_${publicId('sig')}`,
        payerPubkey: input.payer_pubkey?.trim() || null,
      },
      include: { business: { select: { name: true, viewPub: true } } },
    });

    if (poolSettlementEnabled() && input.tx_signature) {
      void this.pool
        .finalizeCustomerDeposit({
          paymentLinkId: updated.publicId,
          txSignature: input.tx_signature,
          viewPub: updated.business.viewPub,
          destination: updated.destinationAddress,
        })
        .catch((error) => {
          this.logger.error(
            `pool finalize failed for ${updated.publicId}: ${String(error)}`,
          );
        });
    }

    return this.toPublic(updated, updated.business.name);
  }

  private effectiveStatus(row: PaymentLink): PaymentLinkStatus | 'expired' {
    if (row.status === PaymentLinkStatus.paid || row.status === PaymentLinkStatus.canceled) {
      return row.status;
    }
    if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
      return PaymentLinkStatus.expired;
    }
    return row.status;
  }

  private linkUrl(publicIdValue: string): string {
    const base = loadConfig().publicAppUrl.replace(/\/$/, '');
    return `${base}/pay/${publicIdValue}`;
  }

  private toMerchant(
    row: PaymentLink,
    businessName: string,
    inPool = false,
  ) {
    const status = this.effectiveStatus(row);
    return {
      id: row.publicId,
      amount: row.amountMinor.toString(),
      currency: row.currency,
      purpose: row.purpose,
      client_name: row.clientName,
      memo: row.memo,
      destination_address: row.destinationAddress,
      expires_at: row.expiresAt?.toISOString() ?? null,
      status,
      paid_at: row.paidAt?.toISOString() ?? null,
      tx_signature: row.txSignature,
      payer_pubkey: row.payerPubkey,
      payout_tx_signature: row.payoutTxSignature,
      in_pool: inPool,
      created_at: row.createdAt.toISOString(),
      url: this.linkUrl(row.publicId),
      business_name: businessName,
      rail: poolSettlementEnabled() ? 'pool' : 'mock',
    };
  }

  private toPublic(row: PaymentLink, businessName: string) {
    const status = this.effectiveStatus(row);
    return {
      id: row.publicId,
      amount: row.amountMinor.toString(),
      currency: row.currency,
      purpose: row.purpose,
      client_name: row.clientName,
      memo: row.memo,
      destination_address: row.destinationAddress,
      expires_at: row.expiresAt?.toISOString() ?? null,
      status,
      paid_at: row.paidAt?.toISOString() ?? null,
      payment_tx_hash: row.txSignature,
      business_name: businessName,
      rail: poolSettlementEnabled() ? 'pool' : 'mock',
    };
  }
}
