import { useState } from 'react';

import type { AgentProfile } from '../lib/api';
import { MINOR_PER_UNIT } from '../lib/format';
import './IntentComposer.css';

interface Props {
  profile: AgentProfile;
  busy: boolean;
  onSubmit: (input: {
    payee_ref: string;
    amount_minor: number;
    reference?: string;
  }) => void;
}

/// Each preset lands in a different region of the authority rail, so the three
/// policy outcomes can be demonstrated without typing.
const PRESETS = [
  { amount: 437, label: 'Routine', hint: 'agent pays alone' },
  { amount: 2_500, label: 'Large', hint: 'needs your approval' },
  { amount: 9_000, label: 'Over cap', hint: 'policy refuses' },
];

export function IntentComposer({ profile, busy, onSubmit }: Props) {
  const [payee, setPayee] = useState(
    profile.allowed_payees[0]?.payee_ref ?? '',
  );
  const [amount, setAmount] = useState('437');
  const [reference, setReference] = useState('invoice #1829');
  const [unlisted, setUnlisted] = useState(false);

  const parsed = Number(amount);
  const valid = Number.isFinite(parsed) && parsed > 0 && payee.length > 0;

  function submit(override?: number) {
    const value = override ?? parsed;
    if (!Number.isFinite(value) || value <= 0) return;
    onSubmit({
      payee_ref: unlisted ? 'supplier_unknown' : payee,
      amount_minor: Math.round(value * MINOR_PER_UNIT),
      reference: reference.trim() || undefined,
    });
  }

  return (
    <section className="panel composer" aria-labelledby="composer-title">
      <div className="panel-head">
        <p className="eyebrow" id="composer-title">
          Request a payment
        </p>
        <span className="composer-actor mono">as {profile.label}</span>
      </div>

      <div className="panel-body composer-body">
        <label className="field">
          <span className="eyebrow">Pay</span>
          <select
            className="control"
            value={unlisted ? '__unlisted' : payee}
            onChange={(event) => {
              const next = event.target.value;
              setUnlisted(next === '__unlisted');
              if (next !== '__unlisted') setPayee(next);
            }}
          >
            {profile.allowed_payees.map((option) => (
              <option key={option.payee_ref} value={option.payee_ref}>
                {option.label}
              </option>
            ))}
            <option value="__unlisted">
              An unlisted supplier (not on the allowlist)
            </option>
          </select>
        </label>

        <label className="field field-amount">
          <span className="eyebrow">Amount</span>
          <div className="control control-amount">
            <input
              className="figure"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-label={`Amount in ${profile.currency}`}
            />
            <span className="control-unit mono">{profile.currency}</span>
          </div>
        </label>

        <label className="field">
          <span className="eyebrow">For</span>
          <input
            className="control"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="invoice #1829"
          />
        </label>

        <button
          className="composer-send"
          onClick={() => submit()}
          disabled={busy || !valid}
        >
          {busy ? 'Requesting…' : 'Request payment'}
        </button>
      </div>

      <div className="composer-presets">
        <span className="eyebrow">Try</span>
        <div className="composer-preset-row">
          {PRESETS.map((preset) => (
            <button
              key={preset.amount}
              className="composer-preset"
              disabled={busy}
              onClick={() => {
                setAmount(String(preset.amount));
                setUnlisted(false);
                submit(preset.amount);
              }}
            >
              <span className="composer-preset-amount figure">
                {preset.amount.toLocaleString('en-US')}
              </span>
              <span className="composer-preset-label">{preset.label}</span>
              <span className="composer-preset-hint">{preset.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
