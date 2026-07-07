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
4. Run npm run setup:agent -- --store YOUR-STORE.myshopify.com --auth-mode theme-only.
5. Read .hazify/agent-setup.md.
6. Run npm run doctor.
7. If Shopify CLI asks for browser login, pause and tell me exactly what to approve.
8. Run npm run theme:list and show me the available themes by name and role.
9. Ask me which theme I want to use: Live, Development, or an unpublished theme by name.
10. Run npm run theme:pull and select that theme when prompted.
11. Run npm run theme:check.

Do not ask me for theme IDs unless the theme list cannot be parsed.
Do not ask me to paste tokens or secrets in chat.
Use npm run auth only if Admin API access is needed.
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
npm run setup:agent -- --store YOUR-STORE.myshopify.com --auth-mode theme-only
```
