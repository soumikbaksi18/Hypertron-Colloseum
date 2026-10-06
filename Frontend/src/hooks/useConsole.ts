import { useCallback, useEffect, useRef, useState } from 'react';

import {
  ApiError,
  api,
  type AgentProfile,
  type PaymentIntent,
  type ReceivedWebhook,
} from '../lib/api';

const POLL_MS = 1200;
const KEY_STORAGE = 'hypertron.agentKey';

/// Statuses that are still moving, so polling should stay fast.
const IN_FLIGHT = new Set(['requires_authorization', 'authorized', 'settling']);

export function useConsole() {
  const [apiKey, setApiKey] = useState<string | null>(() =>
    localStorage.getItem(KEY_STORAGE),
  );
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [intents, setIntents] = useState<PaymentIntent[]>([]);
  const [webhooks, setWebhooks] = useState<ReceivedWebhook[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [gateError, setGateError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [live, setLive] = useState(false);
  const [ready, setReady] = useState(false);

  // Kept in a ref so the polling effect never needs to re-subscribe.
  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selectedId;

  const refresh = useCallback(
    async (key: string) => {
      const [nextProfile, nextIntents, nextWebhooks] = await Promise.all([
        api.agent(key),
        api.listIntents(key),
        api.webhookSink(),
      ]);

      setProfile(nextProfile);
      setIntents(nextIntents);
      setWebhooks(nextWebhooks);
      setLive(true);

      // Follow the newest payment until the operator picks a different one.
      if (!selectedRef.current && nextIntents.length > 0) {
        setSelectedId(nextIntents[0].id);
      }
    },
    [],
  );

  // Validate the stored key once on mount, then hand off to polling.
  useEffect(() => {
    if (!apiKey) {
      setReady(true);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        await refresh(apiKey);
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof ApiError
            ? error.message
            : 'Could not load this agent.';
        setGateError(message);
        setApiKey(null);
        localStorage.removeItem(KEY_STORAGE);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiKey, refresh]);

  // Poll while the console is open. Settlement is asynchronous, so the UI has
  // to observe it rather than assume it.
  useEffect(() => {
    if (!apiKey || !ready) return;

    const timer = setInterval(() => {
      void refresh(apiKey).catch(() => setLive(false));
    }, POLL_MS);

    return () => clearInterval(timer);
  }, [apiKey, ready, refresh]);

  const signIn = useCallback((key: string) => {
    setGateError(null);
    localStorage.setItem(KEY_STORAGE, key);
    setApiKey(key);
    setReady(false);
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(KEY_STORAGE);
    setApiKey(null);
    setProfile(null);
    setIntents([]);
    setWebhooks([]);
    setSelectedId(null);
    setGateError(null);
    setReady(true);
  }, []);

  const requestPayment = useCallback(
    async (input: {
      payee_ref: string;
      amount_minor: number;
      reference?: string;
    }) => {
      if (!apiKey) return;
      setSubmitting(true);
      setActionError(null);
      try {
        const intent = await api.createIntent(apiKey, input);
        setSelectedId(intent.id);
        await refresh(apiKey);
      } catch (error) {
        setActionError(
          error instanceof ApiError
            ? error.message
            : 'Could not request this payment.',
        );
      } finally {
        setSubmitting(false);
      }
    },
    [apiKey, refresh],
  );

  const decide = useCallback(
    async (id: string, action: 'approve' | 'deny') => {
      if (!apiKey) return;
      setDeciding(true);
      setActionError(null);
      try {
        await api.decideIntent(apiKey, id, {
          approved_by: 'console operator',
          action,
        });
        await refresh(apiKey);
      } catch (error) {
        setActionError(
          error instanceof ApiError
            ? error.message
            : 'Could not record that decision.',
        );
      } finally {
        setDeciding(false);
      }
    },
    [apiKey, refresh],
  );

  const selected =
    intents.find((intent) => intent.id === selectedId) ?? intents[0] ?? null;

  return {
    apiKey,
    ready,
    profile,
    intents,
    webhooks,
    selected,
    selectedId: selected?.id ?? null,
    live,
    gateError,
    actionError,
    submitting,
    deciding,
    anyInFlight: intents.some((intent) => IN_FLIGHT.has(intent.status)),
    signIn,
    signOut,
    requestPayment,
    decide,
    select: setSelectedId,
    dismissActionError: () => setActionError(null),
  };
}
