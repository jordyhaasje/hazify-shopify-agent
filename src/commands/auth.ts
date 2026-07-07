import { readLocalConfig, upsertLocalConfig } from "../lib/filesystem.js";
import { logger } from "../lib/logger.js";
import { askAuthMode, askHidden, askStoreDomain } from "../lib/prompts.js";
import { storeSecret } from "../lib/secureStore.js";
import { runLocalOAuth } from "../lib/oauth.js";
import { SCOPE_GROUPS } from "../lib/scopes.js";

export async function authCommand(): Promise<void> {
  logger.title("Hazify Shopify Agent Auth");
  const existing = await readLocalConfig();
  const storeDomain = existing?.storeDomain || (await askStoreDomain());
  const authMode = await askAuthMode();
  const scopes = existing?.scopes?.length ? existing.scopes : [...SCOPE_GROUPS.baseStoreData, ...SCOPE_GROUPS.themes];

  if (authMode === "theme-only") {
    await upsertLocalConfig({ storeDomain, authMode, scopes: [] });
    logger.success("Theme-only mode saved. Admin API credentials were not requested.");
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
