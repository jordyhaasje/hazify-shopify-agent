# Coding Client Setup

Hazify supports two setup styles.

## Agent-first setup

Use this inside Codex, Claude Code, OpenCode, or another coding agent that can run shell commands:

```bash
test -f package.json || cd hazify-shopify-agent
npm run setup:agent
```

With a store:

```bash
test -f package.json || cd hazify-shopify-agent
npm run setup:agent -- --store example.myshopify.com --auth-mode theme-only
```

This mode does not open interactive prompts. It writes:

- `.codex/config.toml`
- `.mcp.json`
- `opencode.json`
- `AGENT_SETUP.md`
- `.hazify/config.local.json`
- `app-template/shopify.app.toml` when a store is provided

The coding agent can then read `AGENT_SETUP.md`, run `npm run doctor`, install Shopify CLI if needed, list themes, pull the selected theme, and run Theme Check.

## Human guided setup

Use this when a person wants a classic terminal wizard:

```bash
npm run setup
```

This mode can ask visible questions, use hidden prompts for secrets, and trigger browser-based Shopify login flows.

## What agents can and cannot do

Most coding agents have a terminal tool in their own UI. They can run commands such as:

```bash
test -f package.json || cd hazify-shopify-agent
npm run doctor
npm run configure
shopify theme list --store example.myshopify.com
npm run theme:check
```

If npm reports `Could not read package.json`, the terminal is not in the cloned repo. Run:

```bash
cd hazify-shopify-agent
```

or open the folder that contains `package.json`.

For Shopify CLI browser login, use:

```bash
shopify auth login
```

Do not add `--store` to `shopify auth login`. In Shopify CLI v4, store selection belongs on commands such as:

```bash
shopify theme list --store example.myshopify.com
```

Agents should not collect secrets in chat. When a token, client secret, or OAuth credential is needed, use:

```bash
npm run auth
```

That command uses hidden terminal prompts and secure local storage.

Browser login flows, Shopify account permissions, and app authorization may still require the human merchant to approve something in the browser.

## OpenCode notes

OpenCode loads project configuration from `opencode.json`. Hazify writes this file with:

- the OpenCode config schema
- `AGENTS.md` and `OPENCODE.md` as instruction files
- Shopify Dev MCP under the `mcp` option

If OpenCode is launched as a desktop app or from a shell where `opencode` is not on `PATH`, the installer can still configure it. "Not detected" only means the CLI executable was not found in the current shell.
