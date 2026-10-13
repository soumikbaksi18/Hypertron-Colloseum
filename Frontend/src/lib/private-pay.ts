import { Transaction } from '@solana/web3.js';

import { assertDepositCommitments, sameFieldHex } from './commitment';
import {
  DepositPreflightError,
  runDepositPreflight,
} from './deposit-preflight';
import {
  clearPendingDeposit,
  recoverableDeposits,
  upsertPendingDeposit,
} from './deposit-pending';
import {
  markNoteSpent,
  pickNotesForAmount,
  privateBalance,
  unspentNotes,
  upsertNote,
  type BookNote,
} from './note-book';
import { bytesToBase64, getPhantom } from './phantom';
import {
  computeCommitment,
  decryptNote,
  encryptNote,
  isNoteBlob,
  proveDeposit,
  proveTransfer2,
  proveTransferOne,
  proveUnshield,
  randomFrHex,
} from './prover';
import type { ShieldKeys } from './shield-keys';
import { walletApi } from './wallet';

export { privateBalance };

async function leafIndexOf(commitment: string): Promise<number> {
  const { leaves } = await walletApi.leaves();
  const want = commitment.replace(/^0x/i, '').toLowerCase();
  const index = leaves.findIndex(
    (leaf) => leaf.replace(/^0x/i, '').toLowerCase() === want,
  );
  if (index < 0) {
    throw new Error(
      'Could not find that note in the pool tree yet. Wait a few seconds and try again.',
    );
  }
  return index;
}

async function waitForLeaf(commitment: string): Promise<number> {
  for (let i = 0; i < 8; i += 1) {
    const { leaves } = await walletApi.leaves();
    const want = commitment.replace(/^0x/i, '').toLowerCase();
    const index = leaves.findIndex(
      (leaf) => leaf.replace(/^0x/i, '').toLowerCase() === want,
    );
    if (index >= 0) return index;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return leafIndexOf(commitment);
}

export async function reconcilePendingDeposits(keys: ShieldKeys): Promise<void> {
  for (const pending of recoverableDeposits()) {
    try {
      const remote = pending.pendingId
        ? await walletApi.depositStatus(pending.pendingId).catch(() => null)
        : null;
      const { leaves } = await walletApi.leaves().catch(() => ({ leaves: [] as string[] }));
      const leafIndex = leaves.findIndex((leaf) =>
        sameFieldHex(leaf, pending.commitment),
      );
      const local = await computeCommitment({
        ownerPk: keys.ownerPk,
        k: pending.k,
        amount: pending.v,
      });
      const onChain = remote?.commitment ?? (leafIndex >= 0 ? pending.commitment : null);
      if (remote?.status === 'failed' || remote?.status === 'expired') {
        upsertPendingDeposit({ ...pending, status: remote.status });
        continue;
      }
      const confirmed =
        remote?.status === 'confirmed' && remote.leaf_index !== undefined
          ? remote.leaf_index
          : leafIndex;
      if (confirmed < 0) continue;
      assertDepositCommitments({
        local,
        proved: pending.commitment,
        prepared: remote?.commitment ?? pending.commitment,
        onChain,
        localAmount: pending.v,
        preparedAmount: remote?.amount ?? pending.v,
      });
      upsertNote({
        commitment: pending.commitment,
        k: pending.k,
        v: pending.v,
        leafIndex: confirmed,
        blob: pending.blob,
        status: 'spendable',
      });
      clearPendingDeposit(pending.commitment);
    } catch {
      // Keep recovery material until the leaf is independently confirmed.
    }
  }
}

export async function syncIncomingNotes(keys: ShieldKeys): Promise<void> {
  await reconcilePendingDeposits(keys);
  const remote = await walletApi.notes().catch(() => ({ notes: [] }));
  const known = new Set(unspentNotes().map((note) => note.commitment));
  for (const row of remote.notes) {
    if (known.has(row.commitment) || !isNoteBlob(row.encrypted_blob)) continue;
    const opened = await decryptNote(keys.viewSecret, row.encrypted_blob);
    if (!opened || opened.ownerPk !== keys.ownerPk) continue;
    const local = await computeCommitment({
      ownerPk: keys.ownerPk,
      k: opened.k,
      amount: opened.v,
    });
    if (!sameFieldHex(local, row.commitment)) continue;
    upsertNote({
      commitment: row.commitment,
      k: opened.k,
      v: opened.v,
      leafIndex: row.leaf_index,
      blob: row.encrypted_blob,
      status: 'spendable',
    });
  }
}

export async function addMoney(input: {
  keys: ShieldKeys;
  payer: string;
  amountMinor: bigint;
  expectedPayer?: string;
  signTransaction: (tx: Transaction) => Promise<{ serialize: () => Uint8Array }>;
}): Promise<{
  txSignature: string;
  status: string;
  note: BookNote | null;
}> {
  const preflight = await runDepositPreflight({
    payer: input.payer,
    amountMinor: input.amountMinor,
    expectedPayer: input.expectedPayer,
  });
  if (!preflight.ok) {
    throw new DepositPreflightError(preflight);
  }
  const amountMinor = preflight.amountSnapped;
  const amount = amountMinor.toString();
  const k = randomFrHex();
  const proved = await proveDeposit({
    ownerPk: input.keys.ownerPk,
    k,
    amount,
  });
  const local = await computeCommitment({
    ownerPk: input.keys.ownerPk,
    k,
    amount,
  });
  const blob =
    (await encryptNote({
      viewPub: input.keys.viewPub,
      ownerPk: input.keys.ownerPk,
      k,
      amount,
    })) ?? null;
  const prepared = await walletApi.prepareDeposit({
    payer_pubkey: input.payer,
    amount,
    commitment: proved.commitment,
    proof: proved.proof,
    blob: blob ?? undefined,
  });
  assertDepositCommitments({
    local,
    proved: proved.commitment,
    prepared: prepared.commitment,
    localAmount: amount,
    preparedAmount: prepared.amount,
  });
  upsertPendingDeposit({
    pendingId: prepared.pending_id,
    commitment: proved.commitment,
    k,
    v: amount,
    ownerPk: input.keys.ownerPk,
    blob,
    txSignature: null,
    status: 'prepared',
    createdAt: Date.now(),
  });
  const raw = Uint8Array.from(atob(prepared.transaction), (ch) =>
    ch.charCodeAt(0),
  );
  const signed = await input.signTransaction(Transaction.from(raw));
  const serialized = signed.serialize();
  const bytes =
    serialized instanceof Uint8Array ? serialized : Uint8Array.from(serialized);
  let result: {
    tx_signature: string;
    status: string;
    commitment: string;
    amount: string;
    leaf_index?: number;
  };
  try {
    result = await walletApi.broadcastDeposit({
      pending_id: prepared.pending_id,
      signed_transaction: bytesToBase64(bytes),
    });
  } catch (error) {
    upsertPendingDeposit({
      pendingId: prepared.pending_id,
      commitment: proved.commitment,
      k,
      v: amount,
      ownerPk: input.keys.ownerPk,
      blob,
      txSignature: null,
      status: 'pending',
      createdAt: Date.now(),
    });
    throw error;
  }
  upsertPendingDeposit({
    pendingId: prepared.pending_id,
    commitment: proved.commitment,
    k,
    v: amount,
    ownerPk: input.keys.ownerPk,
    blob,
    txSignature: result.tx_signature,
    status: result.status === 'confirmed' ? 'submitted' : 'pending',
    createdAt: Date.now(),
  });
  if (result.status !== 'confirmed' || result.leaf_index === undefined) {
    return {
      txSignature: result.tx_signature,
      status: result.status,
      note: null,
    };
  }
  assertDepositCommitments({
    local,
    proved: proved.commitment,
    prepared: prepared.commitment,
    onChain: result.commitment,
    localAmount: amount,
    preparedAmount: result.amount,
  });
  const note: BookNote = {
    commitment: proved.commitment,
    k,
    v: amount,
    leafIndex: result.leaf_index,
    blob,
    status: 'spendable',
  };
  upsertNote(note);
  clearPendingDeposit(proved.commitment);
  return { txSignature: result.tx_signature, status: 'confirmed', note };
}

export async function sendPrivate(input: {
  keys: ShieldKeys;
  amountMinor: bigint;
  recipientOwnerPk: string;
  recipientView: string;
  paymentLinkId?: string;
}): Promise<string> {
  const picked = pickNotesForAmount(input.amountMinor);
  if (!picked) {
    throw new Error('Not enough private USDC. Add money first.');
  }
  const out1K = randomFrHex();
  const out2K = randomFrHex();
  if (picked.length === 1) {
    const note = picked[0];
    const change = BigInt(note.v) - input.amountMinor;
    const index = await leafIndexOf(note.commitment);
    const proved = await proveTransferOne({
      spendSk: input.keys.spendSk,
      k: note.k,
      v: note.v,
      index,
      out1OwnerPk: input.recipientOwnerPk,
      out1K,
      out1V: input.amountMinor.toString(),
      out2OwnerPk: input.keys.ownerPk,
      out2K,
      out2V: change.toString(),
      recipientView: input.recipientView,
      selfView: input.keys.viewPub,
    });
    const recipientBlob =
      (isNoteBlob(proved.note_1) ? proved.note_1 : null) ??
      (await encryptNote({
        viewPub: input.recipientView,
        ownerPk: input.recipientOwnerPk,
        k: out1K,
        amount: input.amountMinor.toString(),
      }));
    const changeBlob =
      (isNoteBlob(proved.note_2) ? proved.note_2 : null) ??
      (change > 0n
        ? await encryptNote({
            viewPub: input.keys.viewPub,
            ownerPk: input.keys.ownerPk,
            k: out2K,
            amount: change.toString(),
          })
        : null);
    const { tx_signature } = await walletApi.transfer({
      root: proved.root,
      nullifier: proved.nullifier,
      out_cm1: proved.out_cm1,
      out_cm2: proved.out_cm2,
      proof: proved.proof,
      note_1: recipientBlob ?? '',
      note_2: changeBlob ?? '',
      spent_cm: note.commitment,
      out1_owner_pk: input.recipientOwnerPk,
      out1_v: input.amountMinor.toString(),
      out2_owner_pk: input.keys.ownerPk,
      out2_v: change.toString(),
      ...(input.paymentLinkId ? { payment_link_id: input.paymentLinkId } : {}),
    });
    markNoteSpent(note.commitment);
    if (change > 0n) {
      const leafIndex = await waitForLeaf(proved.out_cm2);
      upsertNote({
        commitment: proved.out_cm2,
        k: out2K,
        v: change.toString(),
        leafIndex,
        blob: changeBlob,
      });
    }
    return tx_signature;
  }

  const [a, b] = picked;
  const total = BigInt(a.v) + BigInt(b.v);
  const change = total - input.amountMinor;
  const index1 = await leafIndexOf(a.commitment);
  const index2 = await leafIndexOf(b.commitment);
  const proved = await proveTransfer2({
    spendSk: input.keys.spendSk,
    k1: a.k,
    k2: b.k,
    v1: a.v,
    v2: b.v,
    index1,
    index2,
    out1OwnerPk: input.recipientOwnerPk,
    out1K,
    out1V: input.amountMinor.toString(),
    out2OwnerPk: input.keys.ownerPk,
    out2K,
    out2V: change.toString(),
    recipientView: input.recipientView,
  });
  const recipientBlob =
    (isNoteBlob(proved.note_1) ? proved.note_1 : null) ??
    (await encryptNote({
      viewPub: input.recipientView,
      ownerPk: input.recipientOwnerPk,
      k: out1K,
      amount: input.amountMinor.toString(),
    }));
  const changeBlob =
    (isNoteBlob(proved.note_2) ? proved.note_2 : null) ??
    (await encryptNote({
      viewPub: input.keys.viewPub,
      ownerPk: input.keys.ownerPk,
      k: out2K,
      amount: change.toString(),
    }));
  const { tx_signature } = await walletApi.transfer({
    root: proved.root,
    nullifier_1: proved.nullifier_1,
    nullifier_2: proved.nullifier_2,
    out_cm1: proved.out_cm1,
    out_cm2: proved.out_cm2,
    proof: proved.proof,
    note_1: recipientBlob ?? '',
    note_2: changeBlob ?? '',
    spent_cm1: a.commitment,
    spent_cm2: b.commitment,
    out1_owner_pk: input.recipientOwnerPk,
    out1_v: input.amountMinor.toString(),
    out2_owner_pk: input.keys.ownerPk,
    out2_v: change.toString(),
    ...(input.paymentLinkId ? { payment_link_id: input.paymentLinkId } : {}),
  });
  markNoteSpent(a.commitment);
  markNoteSpent(b.commitment);
  if (change > 0n) {
    const leafIndex = await waitForLeaf(proved.out_cm2);
    upsertNote({
      commitment: proved.out_cm2,
      k: out2K,
      v: change.toString(),
      leafIndex,
      blob: changeBlob,
    });
  }
  return tx_signature;
}

export async function cashOut(input: {
  keys: ShieldKeys;
  amountMinor: bigint;
  destination: string;
}): Promise<string> {
  const picked = pickNotesForAmount(input.amountMinor);
  if (!picked || picked.length !== 1) {
    throw new Error(
      'Cash out spends one note. Add money as a single amount, or send change to yourself first.',
    );
  }
  const note = picked[0];
  const changeK = randomFrHex();
  const index = await leafIndexOf(note.commitment);
  const proved = await proveUnshield({
    spendSk: input.keys.spendSk,
    k: note.k,
    v: note.v,
    index,
    recipient: input.destination,
    amount: input.amountMinor.toString(),
    changeK,
  });
  const { tx_signature } = await walletApi.withdraw({
    spent_commitment: note.commitment,
    root: proved.root,
    nullifier: proved.nullifier,
    change_cm: proved.change_cm,
    proof: proved.proof,
    amount: input.amountMinor.toString(),
    note_value: note.v,
  });
  markNoteSpent(note.commitment);
  const change = BigInt(note.v) - input.amountMinor;
  if (change > 0n) {
    const blob = await encryptNote({
      viewPub: input.keys.viewPub,
      ownerPk: input.keys.ownerPk,
      k: changeK,
      amount: change.toString(),
    });
    const leafIndex = await waitForLeaf(proved.change_cm);
    upsertNote({
      commitment: proved.change_cm,
      k: changeK,
      v: change.toString(),
      leafIndex,
      blob,
    });
  }
  return tx_signature;
}

export function requirePhantom() {
  const phantom = getPhantom();
  if (!phantom) {
    window.open('https://phantom.app/', '_blank', 'noopener,noreferrer');
    throw new Error('Install Phantom to continue.');
  }
  return phantom;
}
