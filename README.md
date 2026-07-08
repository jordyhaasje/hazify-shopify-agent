# Hazify Shopify Agent

Hazify Shopify Agent is a local workspace that lets a coding agent become a practical Shopify assistant for a merchant. The intended merchant onboarding surface is only [START_HERE.md](START_HERE.md): a short prompt with one value to fill in, the store domain.

This README is for maintainers and technical reviewers.

## Architecture

- `src/cli.ts` defines the CLI entrypoint.
- `src/commands/` contains setup, launch, auth, data, theme, configure, and doctor commands.
- `src/lib/` contains Shopify CLI wrappers, app provisioning, OAuth, secure storage, MCP config generation, theme helpers, and validation.
- `src/mcp/adminApiServer.ts` exposes a local MCP tool for authenticated Admin GraphQL execution.
- `prompts/` contains task-specific agent instructions loaded on demand.
- `workflows/` contains deeper workflow notes for setup, data access, theme work, deployment, and rollback.
- `theme/` is the ignored local Shopify theme workspace.
- `.hazify/` stores ignored local setup state, generated app config, credentials, and rollback notes.

## Scripts

- `npm run launch`: interactive launcher for setup, theme connection, data access, verification, and theme preview.
- `npm run setup`: guided setup wizard.
- `npm run setup:agent -- --store example.myshopify.com --auth-mode theme-only`: non-interactive agent config generation.
- `npm run doctor`: local health checks for Node, npm, Shopify CLI, client configs, theme path, store access, and data access.
- `npm run configure`: regenerate Codex, Claude Code, and OpenCode MCP configs.
- `npm run data:connect`: provision/link the Shopify app, apply scopes, pull app credentials from Shopify CLI, run the one browser approval, store the offline Admin API token, update MCP configs, and verify access.
- `npm run data:verify`: verify stored Admin API access with a read-only Admin GraphQL query.
- `npm run data:legacy-store-auth`: temporary Shopify CLI store-auth fallback.
- `npm run theme:list`: list remote Shopify themes.
- `npm run theme:pull`: pull a selected theme into `./theme`.
- `npm run theme:check`: run Shopify Theme Check.
- `npm run theme:dev`: start a Shopify theme development preview.
- `npm run mcp:admin`: start the local Admin API MCP server.

## Authentication Flow

Theme access and data-agent access are different.

Theme work uses Shopify CLI login and commands such as `shopify theme list`, `theme pull`, `theme check`, and `theme dev`.

Data-agent work uses `npm run data:connect`. That flow:

1. Writes `.hazify/app/shopify.app.toml` with the selected scopes and local redirect URL.
2. Runs Shopify CLI app linking/creation.
3. Validates the app config.
4. Applies app config updates with `shopify app deploy --allow-updates --no-build`.
5. Reads `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` from `shopify app env show` or `shopify app env pull`.
6. Stores app credentials locally through secure storage.
7. Opens the Shopify approval screen for the merchant.
8. Exchanges the returned code for an offline Admin API token.
9. Stores the token locally and regenerates MCP configs.
10. Verifies access with `npm run data:verify`.

The one browser approval is required by Shopify. The coding agent can open it and explain it, but the merchant must approve it.

## MCP Setup

Hazify writes MCP config for all supported clients in one setup pass:

- Codex: `.codex/config.toml`
- Claude Code: `.mcp.json`
- OpenCode: `opencode.json`

The always-on documentation/schema server is:

```bash
npx -y @shopify/dev-mcp@latest
```

After data access is verified, Hazify adds the local `shopify-admin-api` MCP server. Config files do not need raw token values; the server reads the token from secure local storage or `SHOPIFY_ADMIN_API_TOKEN` if deliberately provided.

No currently tested Shopify CLI MCP package is installable from npm. Hazify therefore keeps direct Shopify CLI wrappers as the default. See `configs/shopify-cli-mcp.md` for the optional package hook.

## Coding Client Notes

Codex reads `AGENTS.md` and project MCP config from `.codex/config.toml`.

Claude Code reads `CLAUDE.md`; this repository keeps `CLAUDE.md` as a tiny import of `AGENTS.md` so Claude, Codex, and OpenCode share one source of rules. Claude Code reads project MCP servers from `.mcp.json`.

OpenCode reads `AGENTS.md` automatically. OpenCode MCP servers are defined in the `mcp` section of `opencode.json`.

If npm reports `Could not read package.json`, the terminal is not in the repository root. The agent should open or `cd` into the folder that contains `package.json`.

For Shopify CLI v4, run `shopify auth login` without a store flag, or let a store command such as `shopify theme list --store example.myshopify.com` trigger login. Do not run `shopify auth login --store`; that flag is not supported.

Treat browser auth as a checkpoint:

1. Start the Shopify CLI or data-access command.
2. Tell the merchant what the browser is asking them to approve.
3. Wait for the merchant to finish.
4. Continue and verify with `shopify theme list --store ...` or `npm run data:verify`.

If the browser does not open cleanly, use the URL or code printed by Shopify CLI, let the merchant finish the approval in any browser, then rerun the verification step.

OpenCode loads project configuration from `opencode.json`. If the `opencode` binary is not on `PATH`, setup can still write the project config.

## Task Routing

The definitive routing table lives in [AGENTS.md](AGENTS.md). Common prompt files include:

- `prompts/order-lookup.md`
- `prompts/order-refund.md`
- `prompts/customer-address.md`
- `prompts/inventory-adjustment.md`
- `prompts/discount-code.md`
- `prompts/draft-order.md`
- `prompts/create-section.md`
- `prompts/edit-section.md`
- `prompts/debug-theme.md`
- `prompts/safe-push.md`
- `prompts/rollback.md`
- `prompts/product-seo.md`
- `prompts/metafields.md`

## Safety

- Never commit `.env`, `.hazify/config.local.json`, `.hazify/credentials*`, `.hazify/tokens*`, `.hazify/app/`, or pulled theme files.
- Never ask the merchant to paste tokens or app secrets into chat.
- Resolve store records by names, handles, SKUs, emails, phone numbers, or order names before asking for IDs.
- Confirm before destructive or hard-to-reverse changes such as refunds, inventory adjustments, discount deletion, draft order completion, or live theme pushes.
- Always run Theme Check before pushing theme changes.
- Push only to development or unpublished themes unless live deployment is explicitly approved.
