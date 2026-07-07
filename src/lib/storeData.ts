import { runShopify, runShopifyInteractive } from "./shopifyCli.js";

const VERIFY_QUERY = "query { shop { name myshopifyDomain } }";

export async function authenticateStoreData(storeDomain: string, scopes: string[]): Promise<number> {
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
  return runShopify([
    "store",
    "execute",
    "--store",
    storeDomain,
    "--query",
    VERIFY_QUERY,
    "--json"
  ]);
}

export function storeDataVerifyCommand(storeDomain: string): string {
  return `shopify store execute --store ${storeDomain} --query "${VERIFY_QUERY}" --json`;
}
