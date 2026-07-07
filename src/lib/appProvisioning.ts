import fs from "fs-extra";
import path from "node:path";
import { runShopify, runShopifyInteractive } from "./shopifyCli.js";
import { fromRoot } from "./filesystem.js";
import { logger } from "./logger.js";

export async function ensureShopifyCliLogin(storeDomain: string): Promise<boolean> {
  const check = await runShopify(["theme", "list", "--store", storeDomain]);
  if (check.ok) return true;
  logger.warn("Shopify CLI could not verify store access yet. The next command may open a browser login flow.");
  const exitCode = await runShopifyInteractive(["theme", "list", "--store", storeDomain]);
  return exitCode === 0;
}

export async function createOrLinkShopifyApp(): Promise<boolean> {
  logger.info("Shopify app creation/linking depends on your Partner account and installed Shopify CLI version.");
  logger.info("If your CLI supports it, run app linking from the app-template directory after setup.");
  return false;
}

export async function writeShopifyAppConfig(storeDomain: string, scopes: string[]): Promise<string> {
  const filePath = fromRoot("app-template", "shopify.app.toml");
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
  "http://127.0.0.1:3456/callback"
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

export async function checkAppConfig(appPath = fromRoot("app-template")): Promise<boolean> {
  const result = await runShopify(["app", "config", "validate", "--path", appPath, "--json"]);
  if (result.ok) return true;
  logger.warn("Shopify CLI could not validate the app template automatically.");
  if (result.stderr || result.stdout) logger.muted([result.stdout, result.stderr].filter(Boolean).join("\n"));
  return false;
}

export function explainManualFallback(storeDomain: string, scopes: string[]): string {
  return `Automatic app provisioning may require Shopify Partner permissions or CLI commands that vary by account.

Manual fallback:
1. Run: shopify app init
2. Link or create an app in your Shopify Partner account.
3. Configure these scopes: ${scopes.join(",")}
4. Set this redirect URL: http://127.0.0.1:3456/callback
5. Install the app on ${storeDomain}, or run: npm run auth
6. If OAuth cannot complete, choose "Existing Admin API access token" and paste the token only into the hidden terminal prompt.`;
}
