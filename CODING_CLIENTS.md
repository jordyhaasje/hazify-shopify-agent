# Coding Client Setup

Hazify supports two setup styles.

If the repository is not cloned yet, use the copy/paste prompt in `START_HERE.md`.

## Agent-first setup

Use this inside Codex, Claude Code, OpenCode, or another coding agent that can run shell commands:

```bash
test -f package.json || cd hazify-shopify-agent
npm run launch
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
- `.hazify/agent-setup.md`
- `.hazify/config.local.json`
- `.hazify/app/shopify.app.toml` when a store is provided

The coding agent can then read `.hazify/agent-setup.md`, run `npm run doctor`, install Shopify CLI if needed, list themes, ask the user to choose by name/role, pull the selected theme, and run Theme Check.

The user should not need a theme ID. Theme IDs are only a fallback when Shopify CLI output cannot be parsed.

The generated files are ignored by Git where they contain local store-specific state. This prevents Shopify CLI from warning about installer-created uncommitted changes before `theme pull`.

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
npm run launch
npm run theme:list
npm run theme:pull
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
npm run launch
```

Then choose "Enable Shopify data agent access". This runs Shopify CLI `store auth`, opens browser approval if needed, and verifies access with `store execute`.

For non-interactive command routing, use:

```bash
npm run data:connect
npm run data:verify
```

Shopify CLI login can create/link apps and manage app configuration, but it does not by itself give this workspace data-agent access. Use `store auth` for the normal local agent route.

Browser login flows, Shopify account permissions, and app authorization may still require the human merchant to approve something in the browser.

Coding agents should treat browser auth as a checkpoint:

1. Start the Shopify CLI command.
2. Tell the user to complete browser login or copy/paste the shown code.
3. Wait for the command to finish or ask the user to confirm completion.
4. Verify with `shopify theme list --store example.myshopify.com`.

If the default browser fails because another browser instance is already open, copy the login URL/code from the terminal and finish the login in any browser. Then return to the coding client and rerun the verification command.

## OpenCode notes

OpenCode loads project configuration from `opencode.json`. Hazify writes this file with:

- the OpenCode config schema
- `AGENTS.md` and `OPENCODE.md` as instruction files
- Shopify Dev MCP under the `mcp` option

If OpenCode is launched as a desktop app or from a shell where `opencode` is not on `PATH`, the installer can still configure it. "Not detected" only means the CLI executable was not found in the current shell.
