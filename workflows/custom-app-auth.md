# Advanced Custom App Authentication

This is the primary data-agent route:

```bash
npm run data:connect
```

Shopify CLI account login is not the same thing as data-agent access.

Shopify CLI login enables CLI workflows such as theme list, theme pull, theme dev, app config validation, and supported store command flows. Admin API store data access requires app authorization or an access token with the right scopes.

Supported modes:

- One-time Shopify OAuth Authorization Code flow for an offline Admin API token.
- Existing Admin API access token as an advanced fallback.
- Legacy Shopify CLI store auth as a temporary fallback.

Shopify CLI can initialize apps, link app config, and deploy scopes, but it does not automatically give this workspace a permanent Admin API token. The OAuth flow requires a Custom App client ID and client secret, redirect URL `http://127.0.0.1:3456/callback`, selected scopes, and one explicit merchant approval in the browser.

Never paste secrets into chat. Use:

```bash
npm run data:connect
```

Secrets are collected through hidden terminal prompts and stored in the OS credential store when available. If OS storage is unavailable, the repo uses an encrypted local file under `.hazify/`, which is gitignored. After OAuth succeeds, Hazify regenerates Codex, Claude Code, and OpenCode MCP configs with the local `shopify-admin-api` server.
