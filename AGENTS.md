# Hazify Shopify Agent Rules

This repository is a local Shopify AI agent workspace for a merchant-facing coding agent. The merchant should only need to talk to the coding agent; the agent should run setup, install tools, configure clients, authenticate, inspect code, and verify work from its own terminal.

## Core Context

Always read this file first. Then read `.hazify/config.local.json` if it exists to learn the store domain, auth mode, configured clients, and selected theme. Read `.hazify/agent-setup.md` only during setup or recovery.

Use task context on demand:

- Theme work: read the matching file in `prompts/` and inspect `theme/`.
- Store data work: read `workflows/store-data.md` plus the matching data prompt.
- Auth or setup work: read `workflows/custom-app-auth.md`.
- Deployment work: read `workflows/safe-deployment.md` and `workflows/rollback.md`.

## Source Of Truth

- Use Shopify AI Toolkit and Shopify Dev MCP for current Shopify docs, schemas, Liquid validation, GraphQL validation, and API behavior.
- Use Shopify CLI for theme operations and app setup.
- Discover current Shopify CLI behavior with `shopify commands` and `shopify help <command>` when uncertain.
- Use direct Shopify CLI wrappers unless a verified Shopify CLI MCP package is configured.

## Setup Rules

- Prefer `npm run launch` for guided setup.
- For a pasted merchant onboarding prompt, run commands yourself: install dependencies, install Shopify CLI if missing, configure clients, connect the store, provision app access, pull a theme, and run checks.
- Use `npm run data:connect` for permanent data-agent access. It provisions/links the Shopify app, pulls app credentials through Shopify CLI, opens the one required browser approval, stores the offline Admin API token locally, updates MCP configs, and verifies access.
- Do not tell the merchant to manually create a Custom App in Shopify Admin. Run the CLI-backed app setup yourself.
- If Shopify CLI asks which organization or app to use, choose or create `Hazify Store Assistant` from the terminal/browser flow. Do not ask the merchant for a client ID or client secret.
- If Shopify CLI reports multiple organizations, ask which organization name to use and rerun with `SHOPIFY_ORG_ID=<id>`.
- If Shopify CLI cannot provision the app, explain that the store owner may need app-development permissions or help from a store admin, then retry `npm run data:connect`.
- The merchant may need to approve Shopify login or app installation in the browser once. Explain plainly what they are approving and wait.
- After `npm run data:connect` or `npm run configure`, tell the merchant to restart or reload the coding app so new MCP servers are loaded.

## Secrets

- Never ask the merchant to paste tokens, client secrets, private keys, or app credentials into chat.
- Do not print full tokens or secrets.
- Never commit `.env`, `.hazify/config.local.json`, `.hazify/credentials*`, `.hazify/tokens*`, `.hazify/app/`, or pulled theme files.
- Treat `.hazify/credentials*` as sensitive local machine state; a generated `.hazify/credentials.key` unlocks encrypted local credentials.
- Use hidden prompts or secure local storage only when unavoidable.

## Store Data Rules

- Do not ask for Shopify IDs first.
- Resolve products by title, handle, or SKU.
- Resolve customers by email, name, or phone.
- Resolve orders by order name, customer email, or customer name.
- Resolve collections and pages by title or handle.
- If multiple matches exist, ask the merchant to choose before changing data.
- Propose destructive or hard-to-reverse changes before executing them.
- Use the local `shopify-admin-api` MCP server for authenticated execution only after validating the operation with Shopify docs/schema tooling.

## Theme Rules

- Use Shopify CLI for theme operations.
- Never edit or push the live theme unless the merchant explicitly approves live changes.
- Push only to development or unpublished themes by default.
- Always run Theme Check before pushing.
- Always summarize changed files before pushing.
- Create a rollback note before pushing.
- Before editing a section, inspect `sections/`, `snippets/`, `assets/`, `templates/`, `config/`, `locales/`, and `blocks/` if present.
- Preserve the theme's design tokens, CSS variables, button classes, responsive patterns, section schema compatibility, app block compatibility, and merchant-editable settings.

## Task Routing

Use this table to choose task context before acting:

| Merchant request | Prompt file |
| --- | --- |
| Orders lookup, orders today, order status | `prompts/order-lookup.md` |
| Order refund | `prompts/order-refund.md` |
| Customer address change | `prompts/customer-address.md` |
| Inventory check or adjustment | `prompts/inventory-adjustment.md` |
| Discount code create/update/disable | `prompts/discount-code.md` |
| Draft order create/update/invoice | `prompts/draft-order.md` |
| Section creation | `prompts/create-section.md` |
| Section editing | `prompts/edit-section.md` |
| Section duplication | `prompts/duplicate-section.md` |
| Theme debug | `prompts/debug-theme.md` |
| Safe push | `prompts/safe-push.md` |
| Rollback | `prompts/rollback.md` |
| Product SEO | `prompts/product-seo.md` |
| Product update | `prompts/update-product.md` |
| Collection update | `prompts/collection-update.md` |
| Metafields or metaobjects update | `prompts/metafields.md` |

## Agent Roles

- Setup agent: environment detection, Shopify CLI install, MCP/client config, app provisioning, OAuth verification.
- Data agent: products, orders, refunds, customers, inventory, discounts, draft orders, content, metafields, and metaobjects.
- Theme agent: local Liquid/theme work, section creation/editing/debugging, Theme Check, preview, safe deployment.
- Safety agent: rollback notes, live-theme guardrails, destructive-change confirmations, secret handling.

These roles are routing guidance for the coding agent. They do not replace Shopify documentation, Shopify AI Toolkit, or the configured MCP servers.
