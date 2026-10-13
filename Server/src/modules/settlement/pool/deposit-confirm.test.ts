import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  classifySignatureStatus,
  decideRecordNote,
  sameCommitment,
} from './deposit-confirm';

describe('classifySignatureStatus', () => {
  it('treats a confirmed signature as confirmed', () => {
    assert.equal(
      classifySignatureStatus({
        found: true,
        confirmationStatus: 'confirmed',
        err: null,
        expired: false,
      }),
      'confirmed',
    );
  });

  it('treats finalized as confirmed', () => {
    assert.equal(
      classifySignatureStatus({
        found: true,
        confirmationStatus: 'finalized',
        err: null,
        expired: false,
      }),
      'confirmed',
    );
  });

  it('treats on-chain program error as failed', () => {
    assert.equal(
      classifySignatureStatus({
        found: true,
        confirmationStatus: 'confirmed',
        err: { InstructionError: [0, 'Custom'] },
        expired: false,
      }),
      'failed',
    );
  });

  it('keeps processed / missing signatures pending', () => {
    assert.equal(
      classifySignatureStatus({
        found: true,
        confirmationStatus: 'processed',
        err: null,
        expired: false,
      }),
      'pending',
    );
    assert.equal(
      classifySignatureStatus({
        found: false,
        confirmationStatus: null,
        err: null,
        expired: false,
      }),
      'pending',
    );
  });

  it('treats a vanished signature after expiry as expired', () => {
    assert.equal(
      classifySignatureStatus({
        found: false,
        confirmationStatus: null,
        err: null,
        expired: true,
      }),
      'expired',
    );
  });
});

describe('decideRecordNote', () => {
  it('records only a confirmed leaf that is visible in the tree', () => {
    assert.deepEqual(
      decideRecordNote({ outcome: 'confirmed', leafIndex: 4 }),
      { record: true, reason: 'confirmed' },
    );
  });

  it('does not record when confirmation timed out', () => {
    assert.deepEqual(decideRecordNote({ outcome: 'pending', leafIndex: 4 }), {
      record: false,
      keepRecovery: true,
      reason: 'pending',
    });
  });

  it('keeps recovery material when the tx is confirmed but the leaf is not indexed yet', () => {
    assert.deepEqual(decideRecordNote({ outcome: 'confirmed', leafIndex: -1 }), {
      record: false,
      keepRecovery: true,
      reason: 'leaf_not_visible',
    });
  });

  it('does not record failed or expired transactions as spendable', () => {
    assert.deepEqual(decideRecordNote({ outcome: 'failed', leafIndex: 0 }), {
      record: false,
      keepRecovery: false,
      reason: 'failed',
    });
    assert.deepEqual(decideRecordNote({ outcome: 'expired', leafIndex: 0 }), {
      record: false,
      keepRecovery: false,
      reason: 'expired',
    });
  });
});

describe('sameCommitment', () => {
  it('compares canonical 0x-prefixed field hex', () => {
    assert.equal(sameCommitment('0x00ab', 'AB'), true);
    assert.equal(
      sameCommitment(
        '0x00000000000000000000000000000000000000000000000000000000000000ab',
        'ab',
      ),
      true,
    );
    assert.equal(sameCommitment('0x01', '0x02'), false);
  });
});
