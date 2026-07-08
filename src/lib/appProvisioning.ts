import fs from "fs-extra";
import path from "node:path";
import { runShopify, runShopifyInteractive } from "./shopifyCli.js";
import { fromRoot } from "./filesystem.js";
import { logger } from "./logger.js";
import { localAppConfigPath } from "./paths.js";
import { OAUTH_CALLBACK_URL } from "./oauth.js";

export async function ensureShopifyCliLogin(storeDomain: string): Promise<boolean> {
  const check = await runShopify(["theme", "list", "--store", storeDomain]);
  if (check.ok) return true;
  logger.warn("Shopify CLI could not verify store access yet. The next command may open a browser login flow.");
  const exitCode = await runShopifyInteractive(["theme", "list", "--store", storeDomain]);
  return exitCode === 0;
}

export async function createOrLinkShopifyApp(storeDomain: string, scopes: string[]): Promise<boolean> {
  logger.step("One-time Shopify Custom App setup");
  logger.info("Create or open your app in the Shopify Dev Dashboard.");
  logger.info(`Set the app URL to: http://127.0.0.1:3456`);
  logger.info(`Add this redirect URL: ${OAUTH_CALLBACK_URL}`);
  logger.info(`Configure these Admin API scopes: ${scopes.join(", ")}`);
  logger.info(`Install the app on ${storeDomain}, then return here to approve the OAuth browser prompt.`);
  logger.warn("Shopify requires merchant approval in the browser once. A coding agent cannot complete that approval headlessly.");
  return true;
}

export async function writeShopifyAppConfig(storeDomain: string, scopes: string[]): Promise<string> {
  const filePath = localAppConfigPath;
  const content = `# Local Shopify app config template for Hazify Shopify Agent.
# Shopify CLI login enables CLI operations. Admin API store data requires an app/token auth flow.

name = "Hazify Shopify Agent"
client_id = ""
application_url = "http://127.0.0.1:3456"
embedded = false

[access_scopes]
scopes = "${scopes.join(",")}"

[auth]
redirect_urls = [
  "${OAUTH_CALLBACK_URL}"
]

[webhooks]
api_version = "2026-07"

[build]
automatically_update_urls_on_dev = true

# Store used during local setup: ${storeDomain}
`;
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, "utf8");
  return filePath;
}

export async function checkAppConfig(appPath = fromRoot(".hazify", "app")): Promise<boolean> {
  const result = await runShopify(["app", "config", "validate", "--path", appPath, "--json"]);
  if (result.ok) return true;
  logger.warn("Shopify CLI could not validate the app template automatically.");
  if (result.stderr || result.stdout) logger.muted([result.stdout, result.stderr].filter(Boolean).join("\n"));
  return false;
}

export function explainManualFallback(storeDomain: string, scopes: string[]): string {
  return `Shopify Custom App setup is the primary data-agent auth route.

One-time browser setup:
1. Create or open a Custom App in the Shopify Dev Dashboard.
2. Configure these Admin API scopes: ${scopes.join(",")}
3. Set this redirect URL: ${OAUTH_CALLBACK_URL}
4. Install the app on ${storeDomain}.
5. Run: npm run data:connect

Legacy fallback: if you cannot create a Custom App, run npm run data:legacy-store-auth.`;
}
