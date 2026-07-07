import { readLocalConfig } from "../lib/filesystem.js";
import type { AiClient } from "../lib/filesystem.js";
import { logger } from "../lib/logger.js";
import { writeMcpConfigs } from "../lib/mcpConfig.js";

export async function configureCommand(): Promise<void> {
  logger.title("Hazify Shopify Agent Configure");
  const config = await readLocalConfig();
  const clients: AiClient[] = config?.configuredClients?.length
    ? config.configuredClients
    : ["codex", "claude", "opencode"];
  await writeMcpConfigs(clients);
  logger.success(`MCP configs generated for: ${clients.join(", ")}`);
}
