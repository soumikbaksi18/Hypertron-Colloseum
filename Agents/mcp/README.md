# Hypertron MCP

Outbound payments under policy. The agent never sees proofs — only intents.

```bash
cd Agents/mcp
npm install
```

Cursor / Claude config:

```json
{
  "mcpServers": {
    "hypertron": {
      "command": "node",
      "args": ["/absolute/path/to/Hypertron-Colloseum/Agents/mcp/index.mjs"],
      "env": {
        "HYPERTRON_API_URL": "http://localhost:4000",
        "HYPERTRON_API_KEY": "ht_sk_…"
      }
    }
  }
}
```

Tools: `create_payment_intent`, `get_payment_intent`, `list_payment_intents`.
