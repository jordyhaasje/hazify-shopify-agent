import { claudeMcpPath, codexConfigPath, opencodeConfigPath } from "./paths.js";
import { readLocalConfig, writeTextFile } from "./filesystem.js";
import type { AiClient } from "./filesystem.js";
import { hasAdminApiToken } from "./secureStore.js";
import { logger } from "./logger.js";

export const SHOPIFY_CLI_MCP_PACKAGE = process.env.HAZIFY_SHOPIFY_CLI_MCP_PACKAGE;
const ADMIN_API_VERSION = "2026-07";

interface AdminApiMcpConfig {
  storeDomain: string;
}

function adminApiEnv(config: AdminApiMcpConfig): Record<string, string> {
  return {
    SHOPIFY_STORE_DOMAIN: config.storeDomain,
    SHOPIFY_ADMIN_API_VERSION: ADMIN_API_VERSION
  };
}

function mcpServersJson(adminApi?: AdminApiMcpConfig): Record<string, { command: string; args: string[]; env?: Record<string, string> }> {
  const servers: Record<string, { command: string; args: string[]; env?: Record<string, string> }> = {
    "shopify-dev-mcp": {
      command: "npx",
      args: ["-y", "@shopify/dev-mcp@latest"]
    }
  };
  if (SHOPIFY_CLI_MCP_PACKAGE) {
    servers["shopify-cli"] = {
      command: "npx",
      args: ["-y", SHOPIFY_CLI_MCP_PACKAGE]
    };
  }
  if (adminApi) {
    servers["shopify-admin-api"] = {
      command: "npm",
      args: ["run", "mcp:admin", "--silent"],
      env: adminApiEnv(adminApi)
    };
  }
  return servers;
}

export function claudeMcpJson(adminApi?: AdminApiMcpConfig): string {
  return JSON.stringify(
    {
      mcpServers: mcpServersJson(adminApi)
    },
    null,
    2
  );
}

function tomlEnv(env: Record<string, string>): string {
  const entries = Object.entries(env).map(([key, value]) => `${key} = ${JSON.stringify(value)}`);
  return `{ ${entries.join(", ")} }`;
}

export function codexToml(adminApi?: AdminApiMcpConfig): string {
  let config = `[mcp_servers.shopify-dev-mcp]
command = "npx"
args = ["-y", "@shopify/dev-mcp@latest"]
`;
  if (SHOPIFY_CLI_MCP_PACKAGE) {
    config += `
[mcp_servers.shopify-cli]
command = "npx"
args = ["-y", "${SHOPIFY_CLI_MCP_PACKAGE}"]
`;
  }
  if (adminApi) {
    config += `
[mcp_servers.shopify-admin-api]
command = "npm"
args = ["run", "mcp:admin", "--silent"]
env = ${tomlEnv(adminApiEnv(adminApi))}
`;
  }
  return config;
}

export function opencodeJson(adminApi?: AdminApiMcpConfig): string {
  const mcp: Record<string, { type: string; command: string[]; enabled: boolean; environment?: Record<string, string> }> = {
    "shopify-dev-mcp": {
      type: "local",
      command: ["npx", "-y", "@shopify/dev-mcp@latest"],
      enabled: true
    }
  };
  if (SHOPIFY_CLI_MCP_PACKAGE) {
    mcp["shopify-cli"] = {
      type: "local",
      command: ["npx", "-y", SHOPIFY_CLI_MCP_PACKAGE],
      enabled: true
    };
  }
  if (adminApi) {
    mcp["shopify-admin-api"] = {
      type: "local",
      command: ["npm", "run", "mcp:admin", "--silent"],
      enabled: true,
      environment: adminApiEnv(adminApi)
    };
  }
  return JSON.stringify(
    {
      "$schema": "https://opencode.ai/config.json",
      mcp
    },
    null,
    2
  );
}

export async function writeMcpConfigs(clients: AiClient[]): Promise<void> {
  const config = await readLocalConfig();
  const hasStoredToken = config?.storeDomain ? await hasAdminApiToken(config.storeDomain) : false;
  const adminApi = config?.storeDomain && (hasStoredToken || process.env.SHOPIFY_ADMIN_API_TOKEN)
    ? { storeDomain: config.storeDomain }
    : undefined;

  if (clients.includes("claude")) {
    await writeTextFile(claudeMcpPath, claudeMcpJson(adminApi));
  }
  if (clients.includes("codex")) {
    await writeTextFile(codexConfigPath, codexToml(adminApi));
  }
  if (clients.includes("opencode")) {
    await writeTextFile(opencodeConfigPath, opencodeJson(adminApi));
  }

  logger.info("MCP configs written. Restart or reload your coding agent to load new MCP servers.");
  if (adminApi) {
    logger.info("MCP servers configured: shopify-dev-mcp, shopify-admin-api");
  } else {
    logger.info("MCP servers configured: shopify-dev-mcp");
    logger.info("Run npm run data:connect to add shopify-admin-api for store data access.");
  }
}
