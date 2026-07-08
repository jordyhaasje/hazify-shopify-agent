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

Hazify uses Shopify CLI to initialize or link the app config, apply scopes and redirect URLs, and read app credentials from `shopify app env show` or `shopify app env pull`. The coding agent should not ask the merchant for the app client ID or client secret.

The agent should not instruct the merchant to go to Shopify Admin, open Develop apps, create a Custom App, paste redirect URLs, or copy app credentials. Run `npm run data:connect` instead. If Shopify CLI asks for an organization or app, choose or create `Hazify Store Assistant` through the terminal/browser flow.

If Shopify CLI reports multiple organizations in a headless agent terminal, rerun with `SHOPIFY_ORG_ID=<organization-id> npm run data:connect`. Do not guess silently.

The OAuth flow still requires one explicit merchant approval in the browser. The agent can open the flow, print the fallback URL, and wait, but cannot click approval headlessly.

Never paste secrets into chat. Use:

```bash
npm run data:connect
```

Secrets are collected from Shopify CLI output or hidden terminal prompts for advanced fallbacks and stored in the OS credential store when available. If OS storage is unavailable, the repo uses encrypted local files under `.hazify/`, which are gitignored. Treat `.hazify/credentials*` as sensitive machine-local credential material. After OAuth succeeds, Hazify regenerates Codex, Claude Code, and OpenCode MCP configs with the local `shopify-admin-api` server.
