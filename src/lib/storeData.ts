import { runShopify, runShopifyInteractive } from "./shopifyCli.js";
import { readAdminApiToken } from "./secureStore.js";

const VERIFY_QUERY = "query { shop { name myshopifyDomain } }";
const DEFAULT_ADMIN_API_VERSION = "2026-07";

export async function legacyAuthenticateStoreData(storeDomain: string, scopes: string[]): Promise<number> {
  return runShopifyInteractive([
    "store",
    "auth",
    "--store",
    storeDomain,
    "--scopes",
    scopes.join(",")
  ]);
}

export async function verifyStoreData(storeDomain: string): Promise<{
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | undefined;
}> {
  const token = await readAdminApiToken(storeDomain, { prompt: false });
  if (!token) {
    return {
      ok: false,
      stdout: "",
      stderr: "No stored Admin API offline token found. Run: npm run data:connect",
      exitCode: 1
    };
  }

  try {
    const response = await fetch(`https://${storeDomain}/admin/api/${DEFAULT_ADMIN_API_VERSION}/graphql.json`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-shopify-access-token": token
      },
      body: JSON.stringify({ query: VERIFY_QUERY })
    });
    const text = await response.text();
    return {
      ok: response.ok,
      stdout: response.ok ? text : "",
      stderr: response.ok ? "" : text || `Shopify Admin API verification failed: HTTP ${response.status}`,
      exitCode: response.ok ? 0 : 1
    };
  } catch (error) {
    return {
      ok: false,
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
      exitCode: 1
    };
  }
}

export function storeDataVerifyCommand(storeDomain: string): string {
  return `npm run data:verify # verifies the stored offline Admin API token for ${storeDomain}`;
}
