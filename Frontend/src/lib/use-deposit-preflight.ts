import { useEffect, useState } from 'react';

import {
  runDepositPreflight,
  type DepositPreflight,
} from './deposit-preflight';

export function useDepositPreflight(input: {
  payer: string | null | undefined;
  amountInput?: string;
  amountMinor?: bigint;
  enabled?: boolean;
}): { preflight: DepositPreflight | null; checking: boolean } {
  const enabled = input.enabled !== false;
  const [preflight, setPreflight] = useState<DepositPreflight | null>(null);
  const [checking, setChecking] = useState(false);
  const amountKey =
    input.amountMinor !== undefined
      ? input.amountMinor.toString()
      : (input.amountInput ?? '');

  useEffect(() => {
    if (!enabled || !input.payer) {
      setPreflight(null);
      setChecking(false);
      return;
    }
    let cancelled = false;
    setChecking(true);
    const timer = window.setTimeout(() => {
      void runDepositPreflight({
        payer: input.payer ?? '',
        amountInput: input.amountInput,
        amountMinor: input.amountMinor,
      }).then((next) => {
        if (!cancelled) {
          setPreflight(next);
          setChecking(false);
        }
      });
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [enabled, input.payer, amountKey, input.amountInput, input.amountMinor]);

  return { preflight, checking };
}
