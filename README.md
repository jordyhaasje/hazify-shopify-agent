# Hazify Shopify Agent

Hazify Shopify Agent is a local workspace for Shopify AI agents. Clone it, run setup, and use Codex, Claude Code, or OpenCode with Shopify AI Toolkit, Shopify Dev MCP, Shopify CLI MCP, and Shopify CLI.

If you are starting from zero with a coding agent, read `START_HERE.md` first. The shortest path is to paste the prompt from that file into Codex, Claude Code, OpenCode, or another coding agent.

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

For most users with a coding agent, do not start by typing separate commands manually. Paste the prompt from `START_HERE.md` into the coding agent and include your store domain.

The coding agent should clone the repo, run `npm install`, and start the launcher:

```bash
git clone https://github.com/<owner>/hazify-shopify-agent.git
cd hazify-shopify-agent
npm install
npm start
```

The launcher lets the user choose what they want to do: configure the workspace, connect a theme, enable Shopify data-agent access, run doctor checks, or start theme development.

Manual guided setup is still supported:

```bash
npm run setup
```

For coding agents running inside Codex, Claude Code, OpenCode, or another agent UI, use the non-interactive setup:

```bash
npm run setup:agent -- --store example.myshopify.com --auth-mode theme-only
```

This writes agent/client configs and `.hazify/agent-setup.md` without blocking on prompts. Read `CODING_CLIENTS.md` for the full agent-first flow.

If npm says it cannot read `package.json`, you are not inside the cloned repo yet. Run `cd hazify-shopify-agent` or open the folder that contains `package.json`.

## Authentication

Shopify CLI login enables CLI workflows such as theme list, theme pull, theme dev, and app config validation. It is not the same thing as an Admin API access token.

For Shopify CLI v4, use `shopify auth login` without a store flag, or let `shopify theme list --store example.myshopify.com` trigger login. Do not run `shopify auth login --store ...`; that flag does not exist.

If browser login opens the wrong browser or fails because an existing browser is already open, copy the URL/code shown by Shopify CLI, finish login manually, then rerun `shopify theme list --store example.myshopify.com`.

Data-agent access uses a permanent Shopify OAuth Authorization Code flow by default:

```bash
npm run data:connect
npm run data:verify
```

This guides the user through one browser approval for a Shopify Custom App, stores the resulting offline Admin API token locally, regenerates MCP configs, and verifies access with a read-only Admin GraphQL query. Shopify requires the merchant to approve app installation in the browser once; this cannot be fully headless.

MCP configs never write the raw token. The local `shopify-admin-api` MCP server reads it from secure storage, or from `SHOPIFY_ADMIN_API_TOKEN` if your team explicitly provides that environment variable.

If a team cannot create a Custom App, `npm run data:legacy-store-auth` remains available as a temporary Shopify CLI fallback. Tokens from that route can expire and should not be the normal coding-agent setup.

## Credential Storage

Secrets are collected only through hidden terminal prompts. The repo never asks you to paste tokens into chat.

Credentials are stored in the OS credential store through optional `keytar` when available. If that is unavailable, an encrypted local file is written under `.hazify/`. The encrypted fallback requires a passphrase and is gitignored. If an AI client starts the MCP server in a fresh process while using encrypted fallback storage, set `HAZIFY_CREDENTIAL_PASSPHRASE` in that client environment so the server can read the token without prompting.

Never commit `.env`, `.hazify/config.local.json`, `.hazify/credentials*`, or `.hazify/tokens*`.

## AI Clients

Codex config is written to `.codex/config.toml`.

Claude Code config is written to `.mcp.json`.

OpenCode example config is written to `opencode.json`. If OpenCode changes its MCP format, copy the same server definitions from `configs/opencode/opencode.example.json` into the current OpenCode settings.

The default documentation/schema MCP server is:

- `npx -y @shopify/dev-mcp@latest`

After `npm run data:connect` stores a valid offline Admin API token, Hazify also adds a local `shopify-admin-api` MCP server to Codex, Claude Code, and OpenCode configs. Tracked example configs use placeholders only; real local configs must never be committed with token values.

The setup objective referenced a public Shopify CLI MCP package, but the listed package is not currently installable from npm. To avoid broken client startup, Hazify uses direct Shopify CLI wrappers by default. If your team has a verified Shopify CLI MCP package, set `HAZIFY_SHOPIFY_CLI_MCP_PACKAGE` before running setup or configure. See `configs/shopify-cli-mcp.md`.

## Daily Commands

```bash
npm run launch
npm start
npm run doctor
npm run configure
npm run data:connect
npm run data:verify
npm run data:legacy-store-auth
npm run auth:advanced
npm run theme:list
npm run theme:pull
npm run theme:check
npm run theme:dev
```

Users do not need to know theme IDs. Run `npm run theme:list`, choose by theme name/role, then run `npm run theme:pull`. Theme IDs are only a fallback.

Theme access and data-agent access are different:

- Theme work uses Shopify CLI and the local `./theme` folder.
- Product, order, customer, inventory, metaobject, and content operations require data-agent access.
- Use the launcher option "Enable Shopify data agent access" or run `npm run data:connect`.
- Shopify CLI can create/link an app and manage app config, but ordinary CLI login alone is not data-agent access. Hazify uses a one-time Shopify OAuth install as the default data route.

The built package also exposes:

```bash
hazify-shopify-agent setup
hazify-shopify-agent launch
hazify-shopify-agent doctor
hazify-shopify-agent auth
hazify-shopify-agent data connect
hazify-shopify-agent data verify
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
