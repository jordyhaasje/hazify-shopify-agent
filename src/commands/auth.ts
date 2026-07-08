import { readLocalConfig, upsertLocalConfig } from "../lib/filesystem.js";
import { logger } from "../lib/logger.js";
import { askAuthMode, askCapabilityScopes, askHidden, askInput, askStoreDomain } from "../lib/prompts.js";
import { storeAdminApiToken } from "../lib/secureStore.js";
import { runLocalOAuth } from "../lib/oauth.js";
import { createOrLinkShopifyApp } from "../lib/appProvisioning.js";
import { legacyAuthenticateStoreData, verifyStoreData } from "../lib/storeData.js";
import { writeMcpConfigs } from "../lib/mcpConfig.js";

async function runPermanentOAuth(storeDomain: string, scopes: string[]): Promise<void> {
  await createOrLinkShopifyApp(storeDomain, scopes);
  const clientId = await askInput("Shopify app client ID:");
  const clientSecret = await askHidden("Shopify app client secret (hidden):");
  const token = await runLocalOAuth({ storeDomain, clientId, clientSecret, scopes });
  const location = await storeAdminApiToken(storeDomain, token.accessToken);
  const storedScopes = token.scope ? token.scope.split(",").map((scope) => scope.trim()).filter(Boolean) : scopes;
  const config = await upsertLocalConfig({ storeDomain, authMode: "shopify-oauth-offline", scopes: storedScopes });
  logger.success(`Permanent offline Admin API token stored using ${location}.`);
  await writeMcpConfigs(config.configuredClients.length ? config.configuredClients : ["codex", "claude", "opencode"]);
  logger.success("MCP configs updated with Shopify Admin API access.");
  const verified = await verifyStoreData(storeDomain);
  if (verified.ok) logger.success("Shopify data-agent access verified.");
  else logger.warn("OAuth completed, but verification did not succeed yet. Re-run npm run data:verify.");
}

export async function authCommand(options: { dataAgent?: boolean; advanced?: boolean } = {}): Promise<void> {
  logger.title("Hazify Shopify Agent Auth");
  const existing = await readLocalConfig();
  const storeDomain = existing?.storeDomain || (await askStoreDomain());
  const authMode = options.dataAgent && !options.advanced
    ? "shopify-oauth-offline"
    : await askAuthMode({ includeThemeOnly: !options.dataAgent, includeStoreAuth: !options.advanced });
  const scopes =
    authMode === "theme-only"
      ? []
      : await askCapabilityScopes();

  if (authMode === "theme-only") {
    await upsertLocalConfig({ storeDomain, authMode, scopes: [] });
    logger.success("Theme-only mode saved. Admin API credentials were not requested.");
    return;
  }

  if (authMode === "shopify-oauth-offline" || authMode === "shopify-cli-oauth") {
    await runPermanentOAuth(storeDomain, scopes);
    return;
  }

  if (authMode === "shopify-store-auth") {
    logger.warn("Using legacy Shopify CLI store auth fallback. Tokens from this route can expire.");
    const exitCode = await legacyAuthenticateStoreData(storeDomain, scopes);
    if (exitCode !== 0) {
      process.exitCode = exitCode;
      return;
    }
    await upsertLocalConfig({ storeDomain, authMode, scopes });
    logger.success("Legacy Shopify CLI store auth completed.");
    return;
  }

  if (authMode === "admin-api-token") {
    const token = await askHidden("Paste Admin API access token (hidden):");
    const location = await storeAdminApiToken(storeDomain, token);
    await upsertLocalConfig({ storeDomain, authMode, scopes });
    logger.success(`Admin API token stored using ${location}.`);
    return;
  }
}
