# Agent Setup Plan

This file is generated for coding agents running inside Codex, Claude Code, OpenCode, or another agent UI.

The agent should execute normal shell commands from its own terminal tool. Do not ask the merchant to copy commands into a separate terminal unless the coding client cannot run shell commands.

Always run commands from the repository root, the folder that contains `package.json`. If npm fails with `Could not read package.json`, the terminal is one directory too high.

## Current Target

- Store: `<your-store>.myshopify.com`
- Auth mode: `theme-only`
- AI clients: `codex`, `claude`, `opencode`
- Theme path: `./theme`

## Agent Rules

1. Run checks and write config files directly.
2. Never ask for tokens or client secrets in chat.
3. Use `npm run auth` for hidden credential prompts.
4. Use Shopify CLI for browser login and theme operations.
5. Stop before live theme pushes unless the merchant explicitly approves live.

## Recommended Agent Flow

```bash
test -f package.json || cd hazify-shopify-agent
test -f package.json || { echo "Run this from the hazify-shopify-agent folder"; exit 1; }
npm install
npm run doctor
npm run configure
shopify version || npm install -g @shopify/cli@latest
shopify theme list --store <your-store>.myshopify.com
npm run theme:pull
npm run theme:check
```

If Admin API access is needed:

```bash
npm run auth
```

For Shopify CLI browser login, run `shopify auth login` without a store flag, or let `shopify theme list --store <your-store>.myshopify.com` trigger the login flow. Do not run `shopify auth login --store`; Shopify CLI v4 does not support that flag.

If the client is OpenCode, ensure `opencode.json` is loaded from the project root. OpenCode supports project config through `opencode.json` and MCP servers through the `mcp` option.

## Human-Friendly Setup

For a classic guided installer, run:

```bash
npm run setup
```
