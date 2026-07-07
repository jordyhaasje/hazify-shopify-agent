# Hazify Shopify Agent

Hazify Shopify Agent is a local workspace for Shopify AI agents. Clone it, run setup, and use Codex, Claude Code, or OpenCode with Shopify AI Toolkit, Shopify Dev MCP, Shopify CLI MCP, and Shopify CLI.

It helps with:

- Shopify store data operations.
- Shopify theme development.
- Section creation, editing, duplication, and debugging.
- Safe preview and draft theme deployment.
- Shopify CLI app provisioning and authentication guidance.
- MCP configuration for Shopify agent tooling.

It is not a Shopify documentation replacement, Admin API replacement, or hosted service. Shopify AI Toolkit and Shopify Dev MCP remain the source of truth for current Shopify docs, schemas, Liquid validation, GraphQL validation, and store execution capabilities.

## Requirements

- Node.js 18 or newer.
- npm.
- Shopify store access.
- Shopify CLI, installable with `npm install -g @shopify/cli@latest`.
- Codex, Claude Code, OpenCode, or any combination of them.

## Recommended Setup

```bash
git clone https://github.com/<owner>/hazify-shopify-agent.git
cd hazify-shopify-agent
npm install
npm run setup
```

Setup checks your local tools, configures selected AI clients, writes MCP configs, asks for your store domain, helps configure Admin API access, lists Shopify themes, pulls your chosen theme into `./theme`, and runs Theme Check.

## Authentication

Shopify CLI login enables CLI workflows such as theme list, theme pull, theme dev, and app config validation. It is not the same thing as an Admin API access token.

Admin API access uses one of three modes:

- Shopify CLI app provisioning / local OAuth.
- Existing Admin API access token.
- Theme-only mode.

If automatic app provisioning cannot be verified because of Shopify CLI version, Partner account permissions, or app setup requirements, setup prints manual fallback steps. It does not fake success.

## Credential Storage

Secrets are collected only through hidden terminal prompts. The repo never asks you to paste tokens into chat.

Credentials are stored in the OS credential store through optional `keytar` when available. If that is unavailable, an encrypted local file is written under `.hazify/`. The encrypted fallback requires a passphrase and is gitignored.

Never commit `.env`, `.hazify/config.local.json`, `.hazify/credentials*`, or `.hazify/tokens*`.

## AI Clients

Codex config is written to `.codex/config.toml`.

Claude Code config is written to `.mcp.json`.

OpenCode example config is written to `opencode.json`. If OpenCode changes its MCP format, copy the same server definitions from `configs/opencode/opencode.example.json` into the current OpenCode settings.

The default MCP server is:

- `npx -y @shopify/dev-mcp@latest`

The setup objective referenced a public Shopify CLI MCP package, but the listed package is not currently installable from npm. To avoid broken client startup, Hazify uses direct Shopify CLI wrappers by default. If your team has a verified Shopify CLI MCP package, set `HAZIFY_SHOPIFY_CLI_MCP_PACKAGE` before running setup or configure. See `configs/shopify-cli-mcp.md`.

## Daily Commands

```bash
npm run doctor
npm run auth
npm run theme:list
npm run theme:pull
npm run theme:check
npm run theme:dev
```

The built package also exposes:

```bash
hazify-shopify-agent setup
hazify-shopify-agent doctor
hazify-shopify-agent auth
hazify-shopify-agent theme list
hazify-shopify-agent theme pull
hazify-shopify-agent theme check
hazify-shopify-agent theme dev
```

## First Prompts To Try

- "Create a new Shopify section for my homepage. Use `prompts/create-section.md`."
- "Find and fix this theme bug. Use `prompts/debug-theme.md`."
- "Find the product by SKU and update its SEO title. Use `prompts/product-seo.md`."
- "Prepare my local theme changes for a safe push. Use `prompts/safe-push.md`."

## Safety Rules

- No GitHub integration is required for Shopify themes.
- Themes are handled locally through Shopify CLI.
- Store data access requires Admin API authorization.
- Always run Theme Check before pushing.
- Push only to development or unpublished themes unless live is explicitly approved.
- Create a rollback note before pushing.
- Resolve resources by title, handle, SKU, email, phone, or order name before asking for IDs.

## Troubleshooting

Run:

```bash
npm run doctor
```

For more details, read `TROUBLESHOOTING.md` and the workflow docs under `workflows/`.
