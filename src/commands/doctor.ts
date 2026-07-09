import fs from "fs-extra";
import { detectEnvironment, isNodeVersionSupported } from "../lib/detect.js";
import { readLocalConfig } from "../lib/filesystem.js";
import { logger } from "../lib/logger.js";
import { claudeMcpPath, codexConfigPath, opencodeConfigPath, themePath } from "../lib/paths.js";
import { hasAdminApiToken } from "../lib/secureStore.js";
import { getShopifyCliVersion, isShopifyCliInstalled, runShopify } from "../lib/shopifyCli.js";
import { verifyStoreData } from "../lib/storeData.js";

function check(ok: boolean, pass: string, fail: string): void {
  if (ok) logger.success(pass);
  else logger.warn(fail);
}

export async function doctorCommand(): Promise<void> {
  logger.title("Hazify Shopify Agent Doctor");
  const detection = await detectEnvironment();
  const config = await readLocalConfig();
  check(isNodeVersionSupported(detection.nodeVersion), `Node.js ${detection.nodeVersion}`, `Node.js ${detection.nodeVersion} detected. Use Node.js 18+.`);
  check(Boolean(detection.npmVersion), `npm ${detection.npmVersion}`, "npm not found.");

  const shopifyInstalled = await isShopifyCliInstalled();
  const shopifyVersion = shopifyInstalled ? await getShopifyCliVersion() : null;
  check(shopifyInstalled, `Shopify CLI installed${shopifyVersion ? `: ${shopifyVersion}` : ""}`, "Shopify CLI not installed. Run: npm install -g @shopify/cli@latest");

  reportClient("Codex", detection.codexInstalled, config?.configuredClients.includes("codex") ?? false);
  reportClient("Claude Code", detection.claudeInstalled, config?.configuredClients.includes("claude") ?? false);
  reportClient("OpenCode", detection.opencodeInstalled, config?.configuredClients.includes("opencode") ?? false);

  check(Boolean(config?.storeDomain), `Store configured: ${config?.storeDomain}`, "Store domain not configured. Run: npm run setup");
  check(await fs.pathExists(themePath), "Theme directory exists: ./theme", "Theme directory missing.");
  if (await fs.pathExists(themePath)) {
    const hasThemeFiles = (await fs.pathExists(`${themePath}/config/settings_schema.json`)) || (await fs.pathExists(`${themePath}/sections`));
    if (hasThemeFiles) logger.success("Theme files appear to be pulled.");
    else logger.warn("Theme directory exists but no Shopify theme files were found yet. Run: npm run theme:pull");
  }
  check(await fs.pathExists(codexConfigPath), "Codex config exists", "Codex config missing.");
  check(await fs.pathExists(claudeMcpPath), "Claude MCP config exists", "Claude MCP config missing.");
  check(await fs.pathExists(opencodeConfigPath), "OpenCode MCP config exists", "OpenCode MCP config missing.");
  await checkOpenCodeMcpConfig(Boolean(config?.storeDomain && config.authMode !== "theme-only"));

  if (config?.storeDomain && shopifyInstalled) {
    const themeInfo = await runShopify(["theme", "info", "--store", config.storeDomain]);
    check(themeInfo.ok, "Shopify CLI store access check completed", "Shopify CLI store access not verified. Run: shopify theme list --store <store>.");
  }

  if (config?.authMode === "theme-only") {
    logger.warn("Shopify data-agent access intentionally skipped for theme-only mode.");
  } else if (config?.storeDomain && ["shopify-oauth-offline", "shopify-cli-oauth", "admin-api-token"].includes(config.authMode)) {
    const verified = await verifyStoreData(config.storeDomain);
    check(verified.ok, "Shopify offline Admin API token verified", "Shopify offline Admin API token not verified. Run: npm run data:connect");
  } else if (config?.authMode === "shopify-store-auth" && config.storeDomain) {
    logger.warn("Legacy Shopify CLI store auth is configured. Prefer: npm run data:connect");
  } else if (config?.storeDomain) {
    const credentials = await hasAdminApiToken(config.storeDomain);
    check(credentials, "Admin API credentials available", "Admin API credentials not configured. Run: npm run data:connect");
  } else {
    logger.warn("Admin API credential check skipped until a store is configured.");
  }

  if (shopifyInstalled && (await fs.pathExists(themePath))) {
    const themeCheck = await runShopify(["theme", "check", "--path", themePath]);
    check(themeCheck.ok, "Theme Check command works", "Theme Check did not complete. It may need a pulled theme or updated Shopify CLI.");
  }
}

async function checkOpenCodeMcpConfig(expectAdminApi: boolean): Promise<void> {
  if (!(await fs.pathExists(opencodeConfigPath))) return;
  try {
    const config = await fs.readJson(opencodeConfigPath) as {
      mcp?: Record<string, { cwd?: string; command?: string[]; enabled?: boolean }>;
    };
    const servers = config.mcp ?? {};
    check(Boolean(servers["shopify-dev-mcp"]), "OpenCode Shopify Dev MCP configured", "OpenCode Shopify Dev MCP missing from opencode.json.");
    if (!expectAdminApi) return;

    const admin = servers["shopify-admin-api"];
    check(Boolean(admin), "OpenCode Shopify Admin API MCP configured", "OpenCode Shopify Admin API MCP missing. Run: npm run data:connect");
    if (admin) {
      check(Boolean(admin.cwd), "OpenCode Shopify Admin API MCP has cwd", "OpenCode Shopify Admin API MCP missing cwd; rerun npm run configure.");
    }
  } catch {
    logger.warn("OpenCode config is not valid JSON. Rerun: npm run configure");
  }
}

function reportClient(name: string, installed: boolean, configured: boolean): void {
  if (installed) {
    logger.success(`${name} CLI detected`);
    return;
  }
  if (configured) {
    logger.info(`${name} config generated; CLI executable not found in this shell. This is OK for desktop apps or clients not on PATH.`);
    return;
  }
  logger.warn(`${name} not detected or configured.`);
}
