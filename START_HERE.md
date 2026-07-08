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
After theme setup, ask me whether I also want product/order/customer/inventory data-agent access. If yes, use the launcher's "Enable Shopify data agent access" option, guide me through the one-time Shopify Custom App browser approval, and then verify the stored offline Admin API token.
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

## Data Agent Functions

Theme setup does not automatically enable product, order, customer, inventory, content, metaobject, or order-support operations.

When the user asks for Shopify data-agent functions, the coding agent should use the launcher option:

```bash
npm start
```

Then choose:

```text
Enable Shopify data agent access
```

This asks for the needed capabilities, opens a one-time Shopify OAuth browser approval for a Custom App, stores the permanent offline Admin API token locally, regenerates MCP configs, and verifies access with `npm run data:verify`. The user should not paste tokens or client secrets into chat.

If the merchant cannot create a Custom App, the coding agent may use `npm run data:legacy-store-auth` as a temporary fallback. Do not use that as the default path.

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
