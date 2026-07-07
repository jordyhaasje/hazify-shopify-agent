# OpenCode Instructions

Use this repository as a safe local Shopify agent workspace.

- Prefer Shopify AI Toolkit and Shopify Dev MCP for current Shopify docs, schemas, validation, and API behavior.
- Use Shopify CLI MCP when configured, or direct Shopify CLI commands for theme workflows.
- The generated `opencode.json` is an example MCP config. If OpenCode changes its MCP format, copy the same server definitions into the current OpenCode settings format.
- If the OpenCode binary is not on `PATH`, continue anyway. Project config is still written to `opencode.json`.
- Never ask the user to paste secrets into chat. Use hidden terminal prompts from `npm run setup` or `npm run auth`.
- Resolve store resources by merchant-friendly values before asking for IDs.
- Inspect the theme structure before editing sections.
- Run Theme Check before pushing.
- Push only to development or unpublished themes unless live is explicitly approved.
- Preserve merchant-editable section schemas, blocks, presets, app block support, responsive patterns, and theme styling conventions.
