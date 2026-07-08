# Claude Code Instructions

This workspace is configured for Shopify work through Shopify AI Toolkit, Shopify Dev MCP, optional Shopify CLI MCP, and Shopify CLI.

- Use Shopify AI Toolkit and Shopify Dev MCP as the source of truth.
- Use `.mcp.json` for local MCP server configuration.
- Use Shopify CLI directly when Shopify CLI MCP is not configured.
- Prefer `npm run launch` for setup and connection tasks.
- When the user asks to configure, connect, pull, or enable something, run the needed terminal command yourself when Claude Code has terminal access. Only pause for hidden secrets or browser approval.
- For Shopify data-agent operations beyond themes, use the launcher option "Enable Shopify data agent access" or run `npm run data:connect` and `npm run data:verify`.
- Do not duplicate Shopify docs in this repo.
- Never ask for secrets in chat. Use `npm run data:connect` for the one-time OAuth browser approval and hidden prompts for app secrets.
- Do not ask for Shopify IDs first. Resolve products, customers, orders, collections, and pages from merchant-friendly identifiers.
- Inspect the existing theme before creating or editing Liquid, CSS, JS, templates, locales, snippets, or blocks.
- Run `npm run theme:check` before any push.
- Do not push to a live theme unless the user explicitly approves live.
- Summarize changed files and create a rollback note before deployment.

Useful starts:

- Read `prompts/create-section.md` before creating a new section.
- Read `workflows/custom-app-auth.md` before Admin API auth work.
- Read `workflows/safe-deployment.md` before pushing theme changes.
