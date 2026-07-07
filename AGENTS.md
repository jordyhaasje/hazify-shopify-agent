# Hazify Shopify Agent Rules

Use this repository as a local Shopify AI agent workspace. Do not treat it as a replacement for Shopify documentation or Shopify AI Toolkit.

## Source of Truth

- Use Shopify AI Toolkit for Shopify-specific agent capabilities.
- Use Shopify Dev MCP for current Shopify docs, schemas, Liquid validation, and API validation.
- Use Shopify CLI MCP when it is configured and working. Otherwise use Shopify CLI directly for theme and store command workflows.
- Discover current Shopify CLI command behavior with `shopify commands` and `shopify help <command>` when uncertain.
- For setup, prefer `npm run launch`. If the user asks you to configure, connect, pull, or enable something, run the terminal command yourself when your coding client has terminal access.
- For Shopify data-agent operations beyond themes, use `npm run launch` and choose "Enable Shopify data agent access", or run `npm run data:connect` and `npm run data:verify`.

## Secrets

- Never ask the user to paste tokens, client secrets, or private keys into chat.
- Use `npm run data:connect` for Shopify CLI store auth. Use `npm run auth:advanced` only for advanced token/OAuth fallback.
- Never print full tokens. Mask secrets in logs and summaries.
- Never commit `.env`, `.hazify/config.local.json`, `.hazify/credentials*`, or `.hazify/tokens*`.

## Store Data

- Do not ask for Shopify IDs first.
- Resolve products by title, handle, or SKU.
- Resolve customers by email, name, or phone.
- Resolve orders by order name, customer email, or customer name.
- Resolve collections by title or handle.
- Resolve pages by title or handle.
- If multiple matches exist, ask the user to choose before changing data.
- Propose destructive changes before executing them.

## Theme Work

- Use Shopify CLI for theme operations.
- Never directly edit live themes or push to live unless the user explicitly approves live changes.
- Push only to development or unpublished themes by default.
- Always run Theme Check before pushing.
- Always summarize changed files before pushing.
- Create a rollback note before pushing.

Before editing a section, inspect:

- `sections/`
- `snippets/`
- `assets/`
- `templates/`
- `config/`
- `locales/`
- `blocks/` if present

A complete section may require changes across:

- `sections/*.liquid`
- `snippets/*.liquid`
- `assets/*.css`
- `assets/*.js`
- `templates/*.json`
- `config/settings_schema.json`
- `locales/*.json`
- `blocks/*`

Preserve the theme's existing style, design tokens, CSS variables, button classes, layout conventions, responsive patterns, section schema compatibility, app block compatibility, and merchant-editable settings.
