import inquirer from "inquirer";
import fs from "fs-extra";
import { detectEnvironment, isNodeVersionSupported } from "../lib/detect.js";
import { ensureWorkspaceDirs, upsertLocalConfig } from "../lib/filesystem.js";
import { runInteractive } from "../lib/exec.js";
import { logger } from "../lib/logger.js";
import { writeMcpConfigs } from "../lib/mcpConfig.js";
import { askAuthMode, askConfirm, askHidden, askStoreDomain, askThemeId, selectAiClients } from "../lib/prompts.js";
import { storeSecret } from "../lib/secureStore.js";
import { isShopifyCliInstalled } from "../lib/shopifyCli.js";
import { installShopifyCliGlobal } from "../lib/packageManager.js";
import { CAPABILITY_SCOPES, DEFAULT_CAPABILITIES, type CapabilityName, uniqueScopes } from "../lib/scopes.js";
import { ensureShopifyCliLogin, createOrLinkShopifyApp, writeShopifyAppConfig, checkAppConfig, explainManualFallback } from "../lib/appProvisioning.js";
import { listThemes, pullTheme, runThemeCheck } from "../lib/themeWorkspace.js";
import { runLocalOAuth } from "../lib/oauth.js";
import { themePath } from "../lib/paths.js";

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
}

async function askCapabilities(): Promise<string[]> {
  const answers = await inquirer.prompt<{ capabilities: CapabilityName[] }>([
    {
      type: "checkbox",
      name: "capabilities",
      message: "What should the agent be allowed to do?",
      choices: Object.keys(CAPABILITY_SCOPES).map((name) => ({ name, value: name })),
      default: DEFAULT_CAPABILITIES
    }
  ]);
  return uniqueScopes(answers.capabilities);
}

async function configureAuth(storeDomain: string, scopes: string[]): Promise<"shopify-cli-oauth" | "admin-api-token" | "theme-only"> {
  const authMode = await askAuthMode();
  if (authMode === "theme-only") {
    logger.info("Theme-only mode selected. Admin API token setup is skipped.");
    return authMode;
  }

  if (authMode === "admin-api-token") {
    const token = await askHidden("Paste Admin API access token (hidden):");
    const storage = await storeSecret(`${storeDomain}:admin-api-token`, token);
    logger.success(`Admin API token stored using ${storage}.`);
    return authMode;
  }

  await writeShopifyAppConfig(storeDomain, scopes);
  await checkAppConfig();
  const linked = await createOrLinkShopifyApp();
  if (!linked) logger.warn(explainManualFallback(storeDomain, scopes));

  if (await askConfirm("Do you have a Shopify app client ID and secret ready for local OAuth?", false)) {
    const clientId = await askHidden("Shopify app client ID:");
    const clientSecret = await askHidden("Shopify app client secret (hidden):");
    const token = await runLocalOAuth({ storeDomain, clientId, clientSecret, scopes });
    const storage = await storeSecret(`${storeDomain}:admin-api-token`, token.accessToken);
    logger.success(`OAuth completed and Admin API token stored using ${storage}.`);
  } else {
    logger.warn("Skipping OAuth token storage for now. Run npm run auth when app credentials are ready.");
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
      { type: "list", name: "theme", message: "Choose a theme to pull into ./theme:", choices }
    ]);
    selected = { id: answer.theme.id, name: answer.theme.name };
  } else {
    selected = await askThemeId(listed.raw);
  }

  const exitCode = await pullTheme(storeDomain, selected.id, themePath);
  return exitCode === 0 ? selected : { id: null, name: null };
}

export async function setupCommand(): Promise<void> {
  logger.title("Hazify Shopify Agent Setup");
  await ensureWorkspaceDirs();
  const detection = await detectEnvironment();

  if (!isNodeVersionSupported(detection.nodeVersion)) {
    throw new Error(`Node.js ${detection.nodeVersion} detected. Please install Node.js 18+ and rerun setup.`);
  }
  logger.success(`Node.js ${detection.nodeVersion}`);
  logger.success(`npm ${detection.npmVersion ?? "not found"}`);
  logger.info(`OS: ${detection.platform} ${detection.arch}`);

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
  const scopes = await askCapabilities();
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
  }

  logger.title("Setup Complete");
  logger.success("Local agent workspace is configured.");
  logger.info("Try: npm run doctor");
  logger.info("Try: npm run theme:dev");
  logger.info("Prompt: Create a new Shopify section for my homepage using prompts/create-section.md");
}
