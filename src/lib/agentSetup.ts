import fs from "fs-extra";
import { fromRoot, type AiClient, type AuthMode } from "./filesystem.js";
import { writeMcpConfigs } from "./mcpConfig.js";
import { localAgentSetupPath, themePath, toDisplayPath } from "./paths.js";
import { SCOPE_GROUPS } from "./scopes.js";
import { writeShopifyAppConfig } from "./appProvisioning.js";

export interface AgentSetupOptions {
  clients: AiClient[];
  storeDomain?: string;
  authMode: AuthMode;
}

export async function writeAgentSetupGuide(options: AgentSetupOptions): Promise<string> {
  await writeMcpConfigs(options.clients);
  const scopes = [...SCOPE_GROUPS.baseStoreData, ...SCOPE_GROUPS.content, ...SCOPE_GROUPS.themes, ...SCOPE_GROUPS.metafields];
  if (options.storeDomain) {
    await writeShopifyAppConfig(options.storeDomain, scopes);
  }
  await fs.ensureDir(themePath);
  await fs.ensureFile(fromRoot("theme", ".gitkeep"));

  const guidePath = localAgentSetupPath;
  const store = options.storeDomain ?? "<your-store>.myshopify.com";
  const content = `# Agent Setup Plan

This local file is generated for coding agents running inside Codex, Claude Code, OpenCode, or another agent UI.

The agent should execute normal shell commands from its own terminal tool. Do not ask the merchant to copy commands into a separate terminal unless the coding client cannot run shell commands.

Always run commands from the repository root, the folder that contains \`package.json\`. If npm fails with \`Could not read package.json\`, the terminal is one directory too high.

## Current Target

- Store: \`${store}\`
- Auth mode: \`${options.authMode}\`
- AI clients: ${options.clients.map((client) => `\`${client}\``).join(", ")}
- Theme path: \`${toDisplayPath(themePath)}\`

## Agent Rules

1. Run checks and write config files directly.
2. Never ask for tokens or client secrets in chat.
3. Use \`npm run auth\` for hidden credential prompts.
4. Use Shopify CLI for browser login and theme operations.
5. Stop before live theme pushes unless the merchant explicitly approves live.

## Recommended Agent Flow

\`\`\`bash
test -f package.json || cd hazify-shopify-agent
test -f package.json || { echo "Run this from the hazify-shopify-agent folder"; exit 1; }
npm install
npm run doctor
npm run configure
shopify version || npm install -g @shopify/cli@latest
npm run theme:list
npm run theme:pull
npm run theme:check
\`\`\`

The user should not need a theme ID. Show available themes by name and role, then ask the user which theme to pull. Use a theme ID only if Shopify CLI output cannot be parsed.

If Admin API access is needed:

\`\`\`bash
npm run auth
\`\`\`

For Shopify CLI browser login, run \`shopify auth login\` without a store flag, or let \`shopify theme list --store ${store}\` trigger the login flow. Do not run \`shopify auth login --store\`; Shopify CLI v4 does not support that flag.

If a browser is already open and the Shopify login flow fails to launch cleanly, copy the login URL or code from the terminal, finish the login in any browser, return to the coding client, and rerun \`shopify theme list --store ${store}\`. The agent should wait for human confirmation before continuing.

If the client is OpenCode, ensure \`opencode.json\` is loaded from the project root. OpenCode supports project config through \`opencode.json\` and MCP servers through the \`mcp\` option.

## Human-Friendly Setup

For a classic guided installer, run:

\`\`\`bash
npm run setup
\`\`\`
`;
  await fs.writeFile(guidePath, content, "utf8");
  return guidePath;
}
