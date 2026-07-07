import { claudeMcpPath, codexConfigPath, opencodeConfigPath } from "./paths.js";
import { writeTextFile } from "./filesystem.js";
import type { AiClient } from "./filesystem.js";

export const SHOPIFY_CLI_MCP_PACKAGE = process.env.HAZIFY_SHOPIFY_CLI_MCP_PACKAGE;

function mcpServersJson(): Record<string, { command: string; args: string[] }> {
  const servers: Record<string, { command: string; args: string[] }> = {
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
  return servers;
}

export function claudeMcpJson(): string {
  return JSON.stringify(
    {
      mcpServers: mcpServersJson()
    },
    null,
    2
  );
}

export function codexToml(): string {
  const base = `[mcp_servers.shopify-dev-mcp]
command = "npx"
args = ["-y", "@shopify/dev-mcp@latest"]
`;
  if (!SHOPIFY_CLI_MCP_PACKAGE) return base;
  return `${base}
[mcp_servers.shopify-cli]
command = "npx"
args = ["-y", "${SHOPIFY_CLI_MCP_PACKAGE}"]
`;
}

export function opencodeJson(): string {
  const mcp: Record<string, { type: string; command: string[]; enabled: boolean }> = {
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
  return JSON.stringify({ mcp }, null, 2);
}

export async function writeMcpConfigs(clients: AiClient[]): Promise<void> {
  if (clients.includes("claude")) {
    await writeTextFile(claudeMcpPath, claudeMcpJson());
  }
  if (clients.includes("codex")) {
    await writeTextFile(codexConfigPath, codexToml());
  }
  if (clients.includes("opencode")) {
    await writeTextFile(opencodeConfigPath, opencodeJson());
  }
}
