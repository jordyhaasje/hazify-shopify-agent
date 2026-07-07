import { readLocalConfig, upsertLocalConfig } from "../lib/filesystem.js";
import { logger } from "../lib/logger.js";
import { askAuthMode, askCapabilityScopes, askHidden, askStoreDomain } from "../lib/prompts.js";
import { storeSecret } from "../lib/secureStore.js";
import { runLocalOAuth } from "../lib/oauth.js";
import { authenticateStoreData, verifyStoreData } from "../lib/storeData.js";

export async function authCommand(options: { dataAgent?: boolean; advanced?: boolean } = {}): Promise<void> {
  logger.title("Hazify Shopify Agent Auth");
  const existing = await readLocalConfig();
  const storeDomain = existing?.storeDomain || (await askStoreDomain());
  const authMode = options.dataAgent && !options.advanced
    ? "shopify-store-auth"
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

  if (authMode === "shopify-store-auth") {
    const exitCode = await authenticateStoreData(storeDomain, scopes);
    if (exitCode !== 0) {
      process.exitCode = exitCode;
      return;
    }
    await upsertLocalConfig({ storeDomain, authMode, scopes });
    const verified = await verifyStoreData(storeDomain);
    if (verified.ok) logger.success("Shopify data-agent access verified.");
    else logger.warn("Store auth completed, but verification query did not succeed yet. Re-run npm run data:verify after browser approval.");
    return;
  }

  if (authMode === "admin-api-token") {
    const token = await askHidden("Paste Admin API access token (hidden):");
    const location = await storeSecret(`${storeDomain}:admin-api-token`, token);
    await upsertLocalConfig({ storeDomain, authMode, scopes });
    logger.success(`Admin API token stored using ${location}.`);
    return;
  }

  const clientId = await askHidden("Shopify app client ID:");
  const clientSecret = await askHidden("Shopify app client secret (hidden):");
  const token = await runLocalOAuth({ storeDomain, clientId, clientSecret, scopes });
  const location = await storeSecret(`${storeDomain}:admin-api-token`, token.accessToken);
  await upsertLocalConfig({ storeDomain, authMode, scopes: token.scope ? token.scope.split(",") : scopes });
  logger.success(`OAuth completed and Admin API token stored using ${location}.`);
}
