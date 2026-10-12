import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, MinLength, Min } from 'class-validator';
import { PublicKey } from '@solana/web3.js';

import { loadConfig } from '../../../common/config/configuration';
import { InvalidRequestException } from '../../../common/exceptions/hypertron.exception';
import { publicId } from '../../../common/utils/crypto.util';
import { WalletSessionGuard } from '../../wallet-auth/wallet-session.guard';
import { CurrentBusiness } from '../../wallet-auth/current-business.decorator';
import type { BusinessContext } from '../../wallet-auth/business-context';
import { bytesToHex, isNoteBlob, randomFrHex } from './pool.bytes';
import { amountBuckets, snapAmountUp } from './pool.denoms';
import { PoolProver } from './pool.prover';
import {
  SolanaPoolSettlementProvider,
  type ClientTransferOneProof,
  type ClientTransferProof,
  type ClientWithdrawProof,
} from '../solana-pool.provider';

class ProveDepositDto {
  @IsString()
  owner_pk!: string;
  @IsString()
  k!: string;
  @IsString()
  amount!: string;
}

class ProveUnshieldDto {
  @IsString()
  spend_sk!: string;
  @IsString()
  k!: string;
  @IsString()
  v!: string;
  @Type(() => Number)
  @IsInt()
  @Min(0)
  index!: number;
  @IsString()
  recipient!: string;
  @IsString()
  amount!: string;
  @IsString()
  change_k!: string;
}

class OwnerPkDto {
  @IsString()
  spend_sk!: string;
}

class DecryptDto {
  @IsString()
  view_secret!: string;
  @IsString()
  blob!: string;
}

class DiscloseDto {
  @IsString()
  @MinLength(64)
  @MaxLength(66)
  view_secret!: string;
}

class EncryptDto {
  @IsString()
  recipient_view!: string;
  @IsString()
  owner_pk!: string;
  @IsString()
  k!: string;
  @IsString()
  v!: string;
}

class CommitmentDto {
  @IsString()
  owner_pk!: string;
  @IsString()
  k!: string;
  @IsString()
  v!: string;
}

class ProveTransferDto {
  @IsString()
  spend_sk!: string;
  @IsString()
  k1!: string;
  @IsString()
  k2!: string;
  @IsString()
  v1!: string;
  @IsString()
  v2!: string;
  @Type(() => Number)
  @IsInt()
  @Min(0)
  index1!: number;
  @Type(() => Number)
  @IsInt()
  @Min(0)
  index2!: number;
  @IsString()
  out1_owner_pk!: string;
  @IsString()
  out1_k!: string;
  @IsString()
  out1_v!: string;
  @IsString()
  out2_owner_pk!: string;
  @IsString()
  out2_k!: string;
  @IsString()
  out2_v!: string;
  @IsOptional()
  @IsString()
  recipient_view?: string;
}

class ProveTransferOneDto {
  @IsString()
  spend_sk!: string;
  @IsString()
  k!: string;
  @IsString()
  v!: string;
  @Type(() => Number)
  @IsInt()
  @Min(0)
  index!: number;
  @IsString()
  out1_owner_pk!: string;
  @IsString()
  out1_k!: string;
  @IsString()
  out1_v!: string;
  @IsString()
  out2_owner_pk!: string;
  @IsString()
  out2_k!: string;
  @IsString()
  out2_v!: string;
  @IsOptional()
  @IsString()
  recipient_view?: string;
}

class PrepareDepositDto {
  @IsString()
  payer_pubkey!: string;
  @IsString()
  amount!: string;
  @IsString()
  commitment!: string;
  @IsString()
  proof!: string;
  @IsOptional()
  @IsString()
  blob?: string;
}

class BroadcastDepositDto {
  @IsString()
  pending_id!: string;
  @IsString()
  signed_transaction!: string;
}

class WalletWithdrawDto {
  @IsString()
  spent_commitment!: string;
  @IsString()
  root!: string;
  @IsString()
  nullifier!: string;
  @IsString()
  change_cm!: string;
  @IsString()
  proof!: string;
  @IsString()
  amount!: string;
  @IsOptional()
  @IsString()
  note_value?: string;
}

class TransferDto {
  @IsOptional()
  @IsString()
  payment_link_id_a?: string;
  @IsOptional()
  @IsString()
  payment_link_id_b?: string;
  @IsOptional()
  @IsString()
  out1_owner_pk?: string;
  @IsOptional()
  @IsString()
  out1_v?: string;
  @IsOptional()
  @IsString()
  @MaxLength(200)
  recipient_view?: string;
  @IsOptional()
  @IsString()
  @MinLength(8)
  root?: string;
  @IsOptional()
  @IsString()
  nullifier_1?: string;
  @IsOptional()
  @IsString()
  nullifier_2?: string;
  @IsOptional()
  @IsString()
  out_cm1?: string;
  @IsOptional()
  @IsString()
  out_cm2?: string;
  @IsOptional()
  @IsString()
  proof?: string;
  @IsOptional()
  @IsString()
  note_1?: string;
  @IsOptional()
  @IsString()
  note_2?: string;
  @IsOptional()
  @IsString()
  nullifier?: string;
  @IsOptional()
  @IsString()
  spent_cm?: string;
  @IsOptional()
  @IsString()
  spent_cm1?: string;
  @IsOptional()
  @IsString()
  spent_cm2?: string;
  @IsOptional()
  @IsString()
  out2_owner_pk?: string;
  @IsOptional()
  @IsString()
  out2_v?: string;
  @IsOptional()
  @IsString()
  payment_link_id?: string;
}

@Controller('v1/pool')
export class PoolHttpController {
  constructor(
    private readonly pool: SolanaPoolSettlementProvider,
    private readonly prover: PoolProver,
  ) {}

  @Get('config')
  config() {
    const cfg = loadConfig().pool;
    return {
      mint: cfg.mint,
      program_id: cfg.programId,
      network: cfg.network,
      indexer_url: cfg.indexerUrl,
      withdraw_delay_sec: cfg.withdrawDelaySec,
      relay_interval_ms: cfg.relayIntervalMs,
      amount_buckets: amountBuckets().map((value) => value.toString()),
      auto_unshield: cfg.autoUnshield,
    };
  }

  @Post('keygen')
  @UseGuards(WalletSessionGuard)
  async keygen() {
    const viewing = await this.prover.keygenViewing();
    const spendSk = randomFrHex();
    const ownerPk = await this.prover.ownerPk(spendSk);
    return {
      spend_sk: spendSk,
      owner_pk: ownerPk,
      view_secret: viewing.viewSecret,
      view_pub: viewing.viewPub,
    };
  }

  @Post('owner-pk')
  @UseGuards(WalletSessionGuard)
  async ownerPk(@Body() body: OwnerPkDto) {
    return { owner_pk: await this.prover.ownerPk(body.spend_sk) };
  }

  @Post('commitment')
  async commitment(@Body() body: CommitmentDto) {
    return {
      commitment: await this.prover.commitment(
        body.owner_pk,
        body.k,
        BigInt(body.v),
      ),
    };
  }

  @Post('encrypt')
  async encrypt(@Body() body: EncryptDto) {
    const blob = await this.prover.encryptNote({
      recipientView: body.recipient_view,
      ownerPk: body.owner_pk,
      k: body.k,
      v: BigInt(body.v),
    });
    return { blob };
  }

  @Post('decrypt')
  @UseGuards(WalletSessionGuard)
  async decrypt(@Body() body: DecryptDto) {
    const note = isNoteBlob(body.blob)
      ? await this.prover.decryptNote(body.view_secret, body.blob)
      : null;
    return { note };
  }

  @Post('disclose')
  @UseGuards(WalletSessionGuard)
  async disclose(@Body() body: DiscloseDto) {
    return this.pool.disclose(body.view_secret);
  }

  @Post('prove/deposit')
  async proveDeposit(@Body() body: ProveDepositDto) {
    const proved = await this.pool.proveDeposit({
      ownerPk: body.owner_pk,
      k: body.k,
      amount: BigInt(body.amount),
    });
    return {
      commitment: proved.commitment,
      proof: bytesToHex(proved.proof),
      public_inputs: proved.publicInputs,
    };
  }

  @Post('prove/unshield')
  @UseGuards(WalletSessionGuard)
  async proveUnshield(@Body() body: ProveUnshieldDto) {
    const proved = await this.pool.proveUnshield({
      spendSk: body.spend_sk,
      k: body.k,
      v: BigInt(body.v),
      index: Number(body.index),
      recipient: body.recipient,
      amount: BigInt(body.amount),
      changeK: body.change_k,
    });
    return {
      root: proved.root,
      nullifier: proved.nullifier,
      change_cm: proved.changeCm,
      proof: bytesToHex(proved.proof),
      public_inputs: proved.publicInputs,
    };
  }

  @Post('prove/transfer')
  @UseGuards(WalletSessionGuard)
  async proveTransfer(@Body() body: ProveTransferDto) {
    const proved = await this.pool.proveTransfer2({
      spendSk: body.spend_sk,
      k: [body.k1, body.k2],
      v: [BigInt(body.v1), BigInt(body.v2)],
      index: [Number(body.index1), Number(body.index2)],
      out1OwnerPk: body.out1_owner_pk,
      out1K: body.out1_k,
      out1V: BigInt(body.out1_v),
      out2OwnerPk: body.out2_owner_pk,
      out2K: body.out2_k,
      out2V: BigInt(body.out2_v),
      recipientView: body.recipient_view,
    });
    return {
      root: proved.root,
      nullifier_1: proved.nullifier1,
      nullifier_2: proved.nullifier2,
      out_cm1: proved.outCm1,
      out_cm2: proved.outCm2,
      proof: bytesToHex(proved.proof),
      note_1: bytesToHex(proved.note1),
      note_2: bytesToHex(proved.note2),
      public_inputs: proved.publicInputs,
    };
  }

  @Post('prove/transfer-one')
  @UseGuards(WalletSessionGuard)
  async proveTransferOne(@Body() body: ProveTransferOneDto) {
    try {
      const proved = await this.pool.proveTransferOne({
        spendSk: body.spend_sk,
        k: body.k,
        v: BigInt(body.v),
        index: Number(body.index),
        out1OwnerPk: body.out1_owner_pk,
        out1K: body.out1_k,
        out1V: BigInt(body.out1_v),
        out2OwnerPk: body.out2_owner_pk,
        out2K: body.out2_k,
        out2V: BigInt(body.out2_v),
        recipientView: body.recipient_view,
      });
      return {
        root: proved.root,
        nullifier: proved.nullifier,
        out_cm1: proved.outCm1,
        out_cm2: proved.outCm2,
        proof: bytesToHex(proved.proof),
        note_1: bytesToHex(proved.note1),
        note_2: bytesToHex(proved.note2),
        public_inputs: proved.publicInputs,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new InvalidRequestException('pool_prove_failed', message);
    }
  }

  @Get('leaves')
  async leaves() {
    return { leaves: await this.pool.merkleLeaves() };
  }

  @Get('notes')
  @UseGuards(WalletSessionGuard)
  async notes(@CurrentBusiness() business: BusinessContext) {
    if (!business.ownerPk) {
      return { notes: [] };
    }
    return { notes: await this.pool.listOpenNotes(business.ownerPk) };
  }

  @Post('prepare-deposit')
  @UseGuards(WalletSessionGuard)
  async prepareDeposit(
    @CurrentBusiness() business: BusinessContext,
    @Body() body: PrepareDepositDto,
  ) {
    if (!business.ownerPk || !business.viewPub) {
      throw new InvalidRequestException(
        'missing_shield_keys',
        'Publish shield keys before adding money.',
      );
    }
    try {
      new PublicKey(body.payer_pubkey);
    } catch {
      throw new InvalidRequestException(
        'invalid_payer',
        'payer_pubkey must be a Solana address.',
        'payer_pubkey',
      );
    }
    const amount = snapAmountUp(BigInt(body.amount));
    if (amount.toString() !== body.amount.trim()) {
      throw new InvalidRequestException(
        'amount_mismatch',
        'Prove the snapped USDC amount before preparing the deposit.',
        'amount',
      );
    }
    const pendingId = publicId('dep');
    try {
      const prepared = await this.pool.prepareCustomerDeposit({
        paymentLinkId: pendingId,
        payer: body.payer_pubkey,
        amount,
        viewPub: business.viewPub,
        ownerPk: business.ownerPk,
        commitment: body.commitment,
        proofHex: body.proof,
        blobHex: body.blob,
      });
      return { ...prepared, pending_id: pendingId, rail: 'pool' as const };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new InvalidRequestException('pool_prepare_failed', message);
    }
  }

  @Post('broadcast-deposit')
  @UseGuards(WalletSessionGuard)
  async broadcastDeposit(
    @CurrentBusiness() business: BusinessContext,
    @Body() body: BroadcastDepositDto,
  ) {
    try {
      return await this.pool.submitCustomerDeposit({
        paymentLinkId: body.pending_id,
        signedTransaction: body.signed_transaction,
        viewPub: business.viewPub,
        destination: business.walletPubkey,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new InvalidRequestException('pool_broadcast_failed', message);
    }
  }

  @Get('deposits/:pendingId')
  @UseGuards(WalletSessionGuard)
  async depositStatus(
    @CurrentBusiness() business: BusinessContext,
    @Param('pendingId') pendingId: string,
  ) {
    const pending = await this.pool.peekCustomerDeposit(pendingId);
    if (!pending) {
      throw new InvalidRequestException(
        'deposit_not_found',
        'No pending deposit with that id.',
      );
    }
    if (!pending.txSignature) {
      return {
        status: pending.status,
        commitment: pending.commitment,
        amount: pending.amount.toString(),
      };
    }
    return this.pool.finalizeCustomerDeposit({
      paymentLinkId: pendingId,
      txSignature: pending.txSignature,
      viewPub: business.viewPub,
      destination: business.walletPubkey,
    });
  }

  @Post('withdraw')
  @UseGuards(WalletSessionGuard)
  async withdraw(
    @CurrentBusiness() business: BusinessContext,
    @Body() body: WalletWithdrawDto,
  ) {
    if (!business.ownerPk) {
      throw new InvalidRequestException(
        'missing_shield_keys',
        'Publish shield keys before cashing out.',
      );
    }
    const proof: ClientWithdrawProof = {
      root: body.root,
      nullifier: body.nullifier,
      change_cm: body.change_cm,
      proof: body.proof,
      amount: body.amount,
    };
    try {
      const signature = await this.pool.withdrawWallet({
        destination: business.walletPubkey,
        spentCommitment: body.spent_commitment,
        ownerPk: business.ownerPk,
        noteValue: BigInt(body.note_value ?? body.amount),
        clientProof: proof,
      });
      return { tx_signature: signature };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new InvalidRequestException('pool_withdraw_failed', message);
    }
  }

  @Post('transfer')
  @UseGuards(WalletSessionGuard)
  async transfer(
    @CurrentBusiness() _business: BusinessContext,
    @Body() body: TransferDto,
  ) {
    if (body.root && body.proof && body.nullifier && !body.nullifier_2) {
      const proof: ClientTransferOneProof = {
        root: body.root,
        nullifier: body.nullifier,
        out_cm1: body.out_cm1 ?? '',
        out_cm2: body.out_cm2 ?? '',
        proof: body.proof,
        note_1: body.note_1,
        note_2: body.note_2,
        spent_cm: body.spent_cm,
        out1_owner_pk: body.out1_owner_pk,
        out1_v: body.out1_v,
        out2_owner_pk: body.out2_owner_pk,
        out2_v: body.out2_v,
        payment_link_id: body.payment_link_id,
      };
      try {
        const signature = await this.pool.submitTransferOne(proof);
        return { tx_signature: signature };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new InvalidRequestException('pool_transfer_failed', message);
      }
    }
    if (body.root && body.proof && body.nullifier_1 && body.nullifier_2) {
      const proof: ClientTransferProof = {
        root: body.root,
        nullifier_1: body.nullifier_1,
        nullifier_2: body.nullifier_2,
        out_cm1: body.out_cm1 ?? '',
        out_cm2: body.out_cm2 ?? '',
        proof: body.proof,
        note_1: body.note_1,
        note_2: body.note_2,
        spent_cm1: body.spent_cm1,
        spent_cm2: body.spent_cm2,
        out1_owner_pk: body.out1_owner_pk,
        out1_v: body.out1_v,
        out2_owner_pk: body.out2_owner_pk,
        out2_v: body.out2_v,
        payment_link_id: body.payment_link_id,
      };
      const signature = await this.pool.submitTransfer(proof, {
        a: body.payment_link_id_a,
        b: body.payment_link_id_b,
      });
      return { tx_signature: signature };
    }
    if (!body.payment_link_id_a || !body.payment_link_id_b) {
      throw new InvalidRequestException(
        'invalid_transfer',
        'Provide a client transfer proof or two payment_link ids.',
      );
    }
    try {
      const signature = await this.pool.transferOpenNotes({
        paymentLinkIdA: body.payment_link_id_a,
        paymentLinkIdB: body.payment_link_id_b,
        out1OwnerPk: body.out1_owner_pk ?? '',
        out1V: BigInt(body.out1_v ?? '0'),
        recipientView: body.recipient_view,
      });
      return { tx_signature: signature };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new InvalidRequestException('pool_transfer_failed', message);
    }
  }
}
