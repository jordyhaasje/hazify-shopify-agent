import fs from "fs-extra";
import { detectEnvironment, isNodeVersionSupported } from "../lib/detect.js";
import { readLocalConfig } from "../lib/filesystem.js";
import { logger } from "../lib/logger.js";
import { claudeMcpPath, codexConfigPath, opencodeConfigPath, themePath } from "../lib/paths.js";
import { hasSecret } from "../lib/secureStore.js";
import { getShopifyCliVersion, isShopifyCliInstalled, runShopify } from "../lib/shopifyCli.js";

function check(ok: boolean, pass: string, fail: string): void {
  if (ok) logger.success(pass);
  else logger.warn(fail);
}

export async function doctorCommand(): Promise<void> {
  logger.title("Hazify Shopify Agent Doctor");
  const detection = await detectEnvironment();
  check(isNodeVersionSupported(detection.nodeVersion), `Node.js ${detection.nodeVersion}`, `Node.js ${detection.nodeVersion} detected. Use Node.js 18+.`);
  check(Boolean(detection.npmVersion), `npm ${detection.npmVersion}`, "npm not found.");

  const shopifyInstalled = await isShopifyCliInstalled();
  const shopifyVersion = shopifyInstalled ? await getShopifyCliVersion() : null;
  check(shopifyInstalled, `Shopify CLI installed${shopifyVersion ? `: ${shopifyVersion}` : ""}`, "Shopify CLI not installed. Run: npm install -g @shopify/cli@latest");

  check(detection.codexInstalled, "Codex detected", "Codex not detected.");
  check(detection.claudeInstalled, "Claude Code detected", "Claude Code not detected.");
  check(detection.opencodeInstalled, "OpenCode detected", "OpenCode not detected.");

  const config = await readLocalConfig();
  check(Boolean(config?.storeDomain), `Store configured: ${config?.storeDomain}`, "Store domain not configured. Run: npm run setup");
  check(await fs.pathExists(themePath), "Theme directory exists: ./theme", "Theme directory missing.");
  check(await fs.pathExists(codexConfigPath), "Codex config exists", "Codex config missing.");
  check(await fs.pathExists(claudeMcpPath), "Claude MCP config exists", "Claude MCP config missing.");
  check(await fs.pathExists(opencodeConfigPath), "OpenCode MCP config exists", "OpenCode MCP config missing.");

  if (config?.storeDomain && shopifyInstalled) {
    const themeInfo = await runShopify(["theme", "info", "--store", config.storeDomain]);
    check(themeInfo.ok, "Shopify CLI store access check completed", "Shopify CLI store access not verified. Run: shopify theme list --store <store>.");
  }

  if (config?.authMode === "theme-only") {
    logger.warn("Admin API credentials intentionally skipped for theme-only mode.");
  } else if (config?.storeDomain) {
    const credentials = await hasSecret(`${config.storeDomain}:admin-api-token`);
    check(credentials, "Admin API credentials available", "Admin API credentials not configured. Run: npm run auth");
  } else {
    logger.warn("Admin API credential check skipped until a store is configured.");
  }

  if (shopifyInstalled && (await fs.pathExists(themePath))) {
    const themeCheck = await runShopify(["theme", "check", "--path", themePath]);
    check(themeCheck.ok, "Theme Check command works", "Theme Check did not complete. It may need a pulled theme or updated Shopify CLI.");
  }
}
