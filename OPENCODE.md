# OpenCode Instructions

Use this repository as a safe local Shopify agent workspace.

- Prefer Shopify AI Toolkit and Shopify Dev MCP for current Shopify docs, schemas, validation, and API behavior.
- Use Shopify CLI MCP when configured, or direct Shopify CLI commands for theme workflows.
- The generated `opencode.json` is an example MCP config. If OpenCode changes its MCP format, copy the same server definitions into the current OpenCode settings format.
- If the OpenCode binary is not on `PATH`, continue anyway. Project config is still written to `opencode.json`.
- Never ask the user to paste secrets into chat. Use `npm run data:connect` for the one-time OAuth browser approval and hidden terminal prompts.
- When the user asks to set up, connect, or enable something, run the needed terminal commands yourself. Prefer `npm run launch` for menu-driven setup. Do not only tell the user which command to run unless the command requires hidden human input or browser approval.
- For product, order, customer, inventory, content, or metaobject operations, use the launcher option "Enable Shopify data agent access" or run `npm run data:connect` and `npm run data:verify`.
- Resolve store resources by merchant-friendly values before asking for IDs.
- Inspect the theme structure before editing sections.
- Run Theme Check before pushing.
- Push only to development or unpublished themes unless live is explicitly approved.
- Preserve merchant-editable section schemas, blocks, presets, app block support, responsive patterns, and theme styling conventions.
