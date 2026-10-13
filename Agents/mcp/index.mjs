#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API_URL = (process.env.HYPERTRON_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
const API_KEY = process.env.HYPERTRON_API_KEY;

if (!API_KEY) {
  console.error('HYPERTRON_API_KEY is required.');
  process.exit(1);
}

async function hypertron(path, init = {}) {
  const headers = {
    Authorization: `Bearer ${API_KEY}`,
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...init.headers,
  };
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message ?? `HTTP ${response.status}`;
    throw new Error(message);
  }
  return payload;
}

function asText(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

const server = new McpServer({
  name: 'hypertron',
  version: '0.1.0',
});

server.tool(
  'create_payment_intent',
  'Create an outbound Hypertron payment intent under the agent policy bound to HYPERTRON_API_KEY.',
  {
    payee_ref: z.string().describe('Allowlisted payee reference, e.g. supplier_acme'),
    amount_minor: z.number().int().positive().describe('Amount in minor units (USDC has 6 decimals)'),
    reference: z.string().optional().describe('Human reference such as invoice #1829'),
  },
  async ({ payee_ref, amount_minor, reference }) => {
    const data = await hypertron('/v1/payment_intents', {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({ payee_ref, amount_minor, reference }),
    });
    return asText(data);
  },
);

server.tool(
  'get_payment_intent',
  'Fetch one payment intent by id.',
  { id: z.string() },
  async ({ id }) => asText(await hypertron(`/v1/payment_intents/${id}`)),
);

server.tool(
  'list_payment_intents',
  'List recent payment intents for this agent.',
  {},
  async () => asText(await hypertron('/v1/payment_intents?limit=40')),
);

const transport = new StdioServerTransport();
await server.connect(transport);
