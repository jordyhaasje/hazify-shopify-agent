import inquirer from "inquirer";
import fs from "fs-extra";
import { detectEnvironment, isNodeVersionSupported } from "../lib/detect.js";
import { ensureWorkspaceDirs, upsertLocalConfig } from "../lib/filesystem.js";
import { runInteractive } from "../lib/exec.js";
import { logger } from "../lib/logger.js";
import { writeMcpConfigs } from "../lib/mcpConfig.js";
import { askAuthMode, askCapabilityScopes, askConfirm, askHidden, askStoreDomain, askThemeId, selectAiClients } from "../lib/prompts.js";
import { storeAdminApiToken } from "../lib/secureStore.js";
import { isShopifyCliInstalled } from "../lib/shopifyCli.js";
import { installShopifyCliGlobal } from "../lib/packageManager.js";
import { DEFAULT_DATA_AGENT_SCOPES } from "../lib/scopes.js";
import { ensureShopifyCliLogin, provisionShopifyAppCredentials, explainManualFallback } from "../lib/appProvisioning.js";
import { listThemes, pullTheme, runThemeCheck } from "../lib/themeWorkspace.js";
import { runLocalOAuth } from "../lib/oauth.js";
import { themePath } from "../lib/paths.js";
import { writeAgentSetupGuide } from "../lib/agentSetup.js";
import type { AiClient, AuthMode } from "../lib/filesystem.js";
import { legacyAuthenticateStoreData, verifyStoreData } from "../lib/storeData.js";

interface SetupOptions {
  agent?: boolean;
  clients?: string;
  store?: string;
  authMode?: AuthMode;
}

function parseClients(value?: string): AiClient[] {
  if (!value || value === "all") return ["codex", "claude", "opencode"];
  const clients = value.split(",").map((client) => client.trim().toLowerCase());
  const valid = new Set(["codex", "claude", "opencode"]);
  const invalid = clients.filter((client) => !valid.has(client));
  if (invalid.length) throw new Error(`Unsupported AI client(s): ${invalid.join(", ")}`);
  return clients as AiClient[];
}

function parseAuthMode(value?: AuthMode): AuthMode {
  if (!value) return "theme-only";
  if (["shopify-oauth-offline", "shopify-store-auth", "shopify-cli-oauth", "admin-api-token", "theme-only"].includes(value)) return value;
  throw new Error(`Unsupported auth mode: ${value}`);
}

async function maybeInstallAiToolkits(clients: string[]): Promise<void> {
  if (clients.includes("codex")) {
    logger.step("Codex Shopify AI Toolkit");
    if (await askConfirm("Run Codex Shopify plugin install command now?", false)) {
      await runInteractive("codex", ["plugin", "add", "shopify@openai-curated"]);
    } else {
      logger.info("Run later: codex plugin add shopify@openai-curated");
    }
  }
  if (clients.includes("claude")) {
    logger.step("Claude Code Shopify AI Toolkit");
    if (await askConfirm("Run Claude Code Shopify plugin install command now?", false)) {
      await runInteractive("claude", ["plugin", "install", "shopify-ai-toolkit@claude-plugins-official"]);
    } else {
      logger.info("Run later: claude plugin install shopify-ai-toolkit@claude-plugins-official");
    }
  }
  if (clients.includes("opencode")) {
    logger.step("OpenCode Shopify configuration");
    logger.info("OpenCode uses project config. Setup writes opencode.json with Shopify Dev MCP and local instructions.");
  }
}

async function configureAuth(storeDomain: string, scopes: string[]): Promise<AuthMode> {
  const authMode = await askAuthMode();
  if (authMode === "theme-only") {
    logger.info("Theme-only mode selected. Admin API token setup is skipped.");
    return authMode;
  }

  if (authMode === "shopify-store-auth") {
    logger.warn("Using legacy Shopify CLI store auth fallback. Tokens from this route can expire.");
    const exitCode = await legacyAuthenticateStoreData(storeDomain, scopes);
    if (exitCode !== 0) throw new Error("Shopify store auth did not complete.");
    return authMode;
  }

  if (authMode === "admin-api-token") {
    const token = await askHidden("Paste Admin API access token (hidden):");
    const storage = await storeAdminApiToken(storeDomain, token);
    logger.success(`Admin API token stored using ${storage}.`);
    return authMode;
  }

  if (authMode === "shopify-oauth-offline" || authMode === "shopify-cli-oauth") {
    let credentials;
    try {
      credentials = await provisionShopifyAppCredentials(storeDomain, scopes);
    } catch (error) {
      logger.warn(explainManualFallback(storeDomain, scopes));
      throw error;
    }
    const token = await runLocalOAuth({ storeDomain, ...credentials, scopes });
    const storage = await storeAdminApiToken(storeDomain, token.accessToken);
    logger.success(`Permanent offline Admin API token stored using ${storage}.`);
    const verified = await verifyStoreData(storeDomain);
    if (verified.ok) logger.success("Shopify data-agent access verified.");
    else logger.warn("OAuth completed, but verification did not succeed yet. Re-run npm run data:verify.");
  }
  return authMode;
}

async function chooseAndPullTheme(storeDomain: string): Promise<{ id: string | null; name: string | null }> {
  const listed = await listThemes(storeDomain);
  if (!listed.ok) {
    logger.warn("Could not list themes automatically.");
    const manual = await askThemeId(listed.raw || listed.error);
    const exitCode = await pullTheme(storeDomain, manual.id, themePath);
    return exitCode === 0 ? manual : { id: null, name: null };
  }

  const choices = listed.themes.map((theme) => ({
    name: `${theme.name} (${theme.id}${theme.role ? `, ${theme.role}` : ""})`,
    value: theme
  }));

  let selected: { id: string; name: string | null };
  if (choices.length) {
    const answer = await inquirer.prompt<{ theme: { id: string; name: string } }>([
      { type: "select", name: "theme", message: "Choose a theme to pull into ./theme:", choices }
    ]);
    selected = { id: answer.theme.id, name: answer.theme.name };
  } else {
    selected = await askThemeId(listed.raw);
  }

  const exitCode = await pullTheme(storeDomain, selected.id, themePath);
  return exitCode === 0 ? selected : { id: null, name: null };
}

export async function setupCommand(options: SetupOptions = {}): Promise<void> {
  logger.title("Hazify Shopify Agent Setup");
  await ensureWorkspaceDirs();
  const detection = await detectEnvironment();

  if (!isNodeVersionSupported(detection.nodeVersion)) {
    throw new Error(`Node.js ${detection.nodeVersion} detected. Please install Node.js 18+ and rerun setup.`);
  }
  logger.success(`Node.js ${detection.nodeVersion}`);
  logger.success(`npm ${detection.npmVersion ?? "not found"}`);
  logger.info(`OS: ${detection.platform} ${detection.arch}`);
  logger.info(`Active shell/client: ${detection.activeClient}`);

  if (options.agent) {
    const clients = parseClients(options.clients);
    const authMode = parseAuthMode(options.authMode);
    const guidePath = await writeAgentSetupGuide({
      clients,
      storeDomain: options.store,
      authMode
    });
    await upsertLocalConfig({
      storeDomain: options.store ?? "",
      themePath: "./theme",
      selectedThemeId: null,
      selectedThemeName: null,
      configuredClients: clients,
      authMode,
      scopes: authMode === "theme-only" ? [] : DEFAULT_DATA_AGENT_SCOPES
    });

    logger.success("Agent-ready configs generated without interactive prompts.");
    logger.info(`Next instructions: ${guidePath}`);
    logger.info("Run inside the coding client: npm run doctor");
    if (!options.store) logger.warn("No store was provided. Re-run with --store <store>.myshopify.com or use npm run setup for guided setup.");
    return;
  }

  const clients = await selectAiClients(detection);
  await maybeInstallAiToolkits(clients);
  await writeMcpConfigs(clients);

  const shopifyInstalled = await isShopifyCliInstalled();
  if (!shopifyInstalled) {
    logger.warn("Shopify CLI is not installed.");
    if (await askConfirm("Install Shopify CLI globally with npm now?", true)) {
      const exitCode = await installShopifyCliGlobal();
      if (exitCode !== 0) throw new Error("Shopify CLI installation failed.");
    }
  }

  const storeDomain = await askStoreDomain();
  const scopes = await askCapabilityScopes();
  const authMode = await configureAuth(storeDomain, scopes);

  if (await isShopifyCliInstalled()) {
    await ensureShopifyCliLogin(storeDomain);
    const selected = await chooseAndPullTheme(storeDomain);
    if (await fs.pathExists(themePath)) {
      await runThemeCheck(themePath);
    }
    await upsertLocalConfig({
      storeDomain,
      themePath: "./theme",
      selectedThemeId: selected.id,
      selectedThemeName: selected.name,
      configuredClients: clients,
      authMode,
      scopes
    });
    await writeMcpConfigs(clients);
  } else {
    await upsertLocalConfig({
      storeDomain,
      themePath: "./theme",
      selectedThemeId: null,
      selectedThemeName: null,
      configuredClients: clients,
      authMode,
      scopes
    });
    await writeMcpConfigs(clients);
  }

  logger.title("Setup Complete");
  logger.success("Local agent workspace is configured.");
  logger.info("Try: npm run doctor");
  logger.info("Try: npm run theme:dev");
  logger.info("Prompt: Create a new Shopify section for my homepage using prompts/create-section.md");
}
