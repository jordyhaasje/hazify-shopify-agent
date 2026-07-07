# Getting Started

If you are using Codex, Claude Code, OpenCode, Cursor, or another coding agent, start with `START_HERE.md` and paste that prompt into the agent.

## 1. Install

```bash
npm install
```

If Shopify CLI is not installed, setup can offer to install it globally:

```bash
npm install -g @shopify/cli@latest
```

## 2. Run Setup

```bash
npm start
```

Use the launcher to choose what you want to do: set up the workspace, connect a theme, enable Shopify data-agent access, run doctor checks, or start theme development.

The classic wizard is still available:

```bash
npm run setup
```

If you are running this from a coding agent UI, prefer:

```bash
npm run setup:agent -- --store example.myshopify.com --auth-mode theme-only
```

Then ask the agent to read `.hazify/agent-setup.md` and continue from there.

If the agent cloned into a parent folder, make sure it runs commands from the actual repo:

```bash
cd hazify-shopify-agent
```

## 3. Check Health

```bash
npm run doctor
```

Resolve any warnings before making store changes.

## 4. Start Theme Development

```bash
npm run theme:dev
```

This starts a Shopify development preview using your local `./theme` folder.

## 5. Use Prompt Recipes

Open a prompt from `prompts/` and paste it into your AI client. The agent instruction files tell the AI to inspect the theme, use Shopify tooling, avoid secrets in chat, run Theme Check, and avoid live pushes.
