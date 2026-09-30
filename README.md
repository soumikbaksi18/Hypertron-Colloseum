# Hypertron

**The programmable private financial layer for businesses and autonomous agents.**

Businesses and AI agents increasingly need to move money programmatically — paying
suppliers, settling invoices, purchasing services, distributing funds — but every
transaction can expose sensitive financial relationships, counterparties, and
commercial activity.

Hypertron lets applications and agents request, authorize, execute, and reconcile
payments privately, with programmable spending controls and selective disclosure
when verification is required.

> Give agents financial authority without giving away your financial privacy.

## The spine

```
Agent -> Payment Intent -> Policy & Authorization -> Private Settlement -> Reconciliation
```

An agent never needs to understand Groth16, Merkle trees, nullifiers, or
blockchain transactions. It requests a payment, learns whether it is authorized,
executes privately, and receives a machine-readable settlement result.

## Repository layout

| Directory | Role |
|---|---|
| `Server/` | NestJS. Payment-intent API, policy engine, private-settlement adapter, signed webhooks. |
| `Agents/` | FastAPI. Thin client and a scripted agent — the first consumer of the layer, not an agent framework. |
| `Indexer/` | NestJS. Chain event ingestion (Solana). |
| `Frontend/` | Vite + React. Operator console: spending authority, the human-approval step, and the redaction view. |

## Running the demo

Requires Node 20+, Python 3.11+, and a local PostgreSQL.

### 1. Server

```bash
cd Server
cp .env.example .env          # set DATABASE_URL to your local Postgres
npm install
npx prisma db push            # create the schema
npm run seed                  # demo business + agent + API key + policy
npm run build && npm start    # listens on :4000
```

The seed prints the agent's API key. That key *is* the agent's identity, so its
spending limits and merchant policy travel with it:

| Control | Demo value |
|---|---|
| Per-transaction limit | 5,000 USDC |
| Daily limit | 20,000 USDC |
| Auto-approve threshold | 1,000 USDC |
| Allowlisted payees | `supplier_acme`, `supplier_globex` |

Anything at or below the auto-approve threshold is authorized automatically.
Above it, the intent parks in `requires_approval` for a human.

### 2. Agent

```bash
cd Agents
python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt
HYPERTRON_API_KEY=ht_sk_... ./.venv/bin/python -m app.demo
```

The script walks all four outcomes: autonomous settlement, human approval,
settlement after approval, and a policy denial.

To run the agent as a service instead:

```bash
./.venv/bin/uvicorn app.main:app --port 8000
```

### 3. Console

```bash
cd Frontend
npm install
npm run dev                   # http://localhost:5173
```

Paste the API key from `npm run seed` at the gate. The console reads the same
API the agent does — there is no privileged back channel — and shows four
things:

- **Authority today.** The daily budget drawn as a graduated scale, with the
  auto-approve threshold as a labelled line and the per-payment cap behind it.
  Each payment is plotted at the amount it asked for, so a parked payment is
  visibly sitting past the line rather than merely tagged as blocked.
- **Live trace.** The five lifecycle stages, the policy reasons in operator
  language, the approve/deny control, and the settlement receipt.
- **Reconciliation.** Signed webhooks as the local sink receives them, with the
  signature check on each row.
- **Payments, two ways.** Toggle *What you see* / *What the chain shows* to
  compare the business's view against an outside observer's. Counterparty,
  amount and purpose redact; the fact that a shielded payment settled does not.

A few demo runs will legitimately exhaust the agent's 20,000 USDC daily
allowance, after which every payment is denied for the right reason. To start
the day over without reissuing the key:

```bash
cd Server && npm run reset:day
```

## API

All routes require `Authorization: Bearer ht_sk_...`.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/v1/payment_intents` | Request a payment. Policy is evaluated before the response returns. |
| `GET` | `/v1/payment_intents/:id` | Machine-readable settlement result. |
| `GET` | `/v1/payment_intents` | Recent intents for the business. |
| `POST` | `/v1/payment_intents/:id/approve` | Human approves or denies a parked intent. |
| `POST` | `/v1/payment_intents/:id/cancel` | Cancel before settlement. |

Creating an intent:

```bash
curl -X POST localhost:4000/v1/payment_intents \
  -H "Authorization: Bearer $HYPERTRON_API_KEY" \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: invoice-1829' \
  -d '{"payee_ref":"supplier_acme","amount_minor":437000000,"reference":"invoice #1829"}'
```

Amounts are always integer minor units — 6 decimals for USDC, so
`437000000` is $437.00. `Idempotency-Key` is scoped to the calling agent, so a
network retry cannot pay twice.

### Lifecycle

```
requires_authorization ─┬─> denied
                        ├─> requires_approval ─┬─> authorized
                        │                      ├─> denied
                        │                      └─> canceled
                        └─> authorized ─┬─> settling ─┬─> settled
                                        └─> canceled  └─> failed
```

Transitions are compare-and-set, so concurrent callers cannot both win the same
transition.

### Webhooks

Every transition emits an append-only event, fanned out to the business's
endpoint and signed:

```
Hypertron-Signature: t=<unix_seconds>,v1=<hmac_sha256("<t>.<raw_body>")>
```

Attempt state lives in the database and a sweep retries what is due, so delivery
survives a restart. `GET /dev/webhook-sink` shows what a local integrator
received, including signature verification — that sink is a demo aid, not part of
the product surface.

## Private settlement

`PrivateSettlementProvider` in
[`Server/src/modules/settlement/settlement.types.ts`](Server/src/modules/settlement/settlement.types.ts)
is the seam. It returns opaque handles plus a viewing-key hint, never proofs or
note preimages, so the agent-facing contract is already final.

`MockSettlementProvider` satisfies it today. The BN254 Groth16 Anchor pool will
satisfy it next, without the API or the agent contract changing.

## Honest limitations

- Settlement is currently mocked; no on-chain program is deployed yet.
- Webhook delivery is in-process. Redis/BullMQ is the upgrade path.
- Approval is authenticated with the agent's API key. Production needs a separate
  dashboard session so an agent cannot approve its own parked payment — which is
  also why the console currently signs in with that same key.
- Policy is limits plus a payee allowlist, not a general policy language.
- The console polls rather than streaming, and reads reconciliation from
  `/dev/webhook-sink`, which stands in for the business's accounting system.

## Not in scope

Not another privacy protocol competing on the underlying primitive, and not an
AI-agent platform. See [`docs/positioning.md`](../docs/positioning.md).
