# Start Here

Use this when the repository is not cloned yet.

## Recommended User Flow

The user should start in their coding agent, not in this repository.

Open Codex, Claude Code, OpenCode, Cursor, or another coding agent and paste this prompt:

```text
Set up my local Shopify AI agent workspace.

Repository:
https://github.com/jordyhaasje/hazify-shopify-agent

My Shopify store domain:
YOUR-STORE.myshopify.com

Please do everything from your terminal tools:
1. Clone the repository.
2. cd into the cloned hazify-shopify-agent folder.
3. Run npm install.
4. Run npm start.
5. In the launcher, set up the workspace for coding agents.
6. Read .hazify/agent-setup.md.
7. Run doctor checks from the launcher.
8. Choose and pull a Shopify theme from the launcher.
9. If Shopify CLI asks for browser login, pause and tell me exactly what to approve.
10. Show me available themes by name and role.
11. Ask me which theme I want to use: Live, Development, or an unpublished theme by name.
12. Run Theme Check after pulling the theme.

Do not ask me for theme IDs unless the theme list cannot be parsed.
Do not ask me to paste tokens or secrets in chat.
Use the launcher's "Enable Shopify data agent access" option only if Admin API access is needed.
Never push to the live theme unless I explicitly approve live deployment.
```

Replace `YOUR-STORE.myshopify.com` with the real store domain before sending.

## Does The User Need A Theme ID?

No.

The normal flow is:

1. The agent runs `npm run theme:list`.
2. The agent shows theme names and roles.
3. The user chooses by human-friendly name, for example `Live`, `Development`, or `Horizon`.
4. The agent runs `npm run theme:pull`.
5. Shopify CLI asks for a theme selection if needed.

Theme IDs are only a fallback when Shopify CLI output cannot be parsed.

## When Should A User Run Commands Manually?

Only when they are not using a coding agent.

Manual setup:

```bash
git clone https://github.com/jordyhaasje/hazify-shopify-agent.git
cd hazify-shopify-agent
npm install
npm run setup
```

Agent setup:

```bash
git clone https://github.com/jordyhaasje/hazify-shopify-agent.git
cd hazify-shopify-agent
npm install
npm start
```
