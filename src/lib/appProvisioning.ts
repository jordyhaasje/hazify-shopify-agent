import fs from "fs-extra";
import path from "node:path";
import { runShopify, runShopifyInteractive } from "./shopifyCli.js";
import { fromRoot } from "./filesystem.js";
import { logger } from "./logger.js";
import { localAppConfigPath, localAppEnvPath } from "./paths.js";
import { OAUTH_CALLBACK_URL } from "./oauth.js";
import { installShopifyCliGlobal } from "./packageManager.js";
import { storeShopifyAppCredentials } from "./secureStore.js";
import { isShopifyCliInstalled } from "./shopifyCli.js";

export interface ShopifyAppCredentials {
  clientId: string;
  clientSecret: string;
}

export async function ensureShopifyCliLogin(storeDomain: string): Promise<boolean> {
  const check = await runShopify(["theme", "list", "--store", storeDomain]);
  if (check.ok) return true;
  logger.warn("Shopify CLI could not verify store access yet. The next command may open a browser login flow.");
  const exitCode = await runShopifyInteractive(["theme", "list", "--store", storeDomain]);
  return exitCode === 0;
}

export async function createOrLinkShopifyApp(storeDomain: string, scopes: string[]): Promise<boolean> {
  logger.step("One-time Shopify app setup");
  logger.info("Hazify will ask Shopify CLI to create or link the local app, set the redirect URL, and apply the selected access scopes.");
  logger.info("A Shopify browser window may open. Please approve Shopify login or app access there, then return here.");
  await writeShopifyAppConfig(storeDomain, scopes);

  if (!(await isShopifyCliInstalled())) {
    logger.warn("Shopify CLI is not installed. Installing it now with npm.");
    const exitCode = await installShopifyCliGlobal();
    if (exitCode !== 0) throw new Error("Shopify CLI installation failed.");
  }

  const appPath = path.dirname(localAppConfigPath);
  const linkExitCode = await runShopifyInteractive(["app", "config", "link", "--path", appPath]);
  if (linkExitCode !== 0) throw new Error("Shopify app creation/linking did not complete.");

  await checkAppConfig(appPath);
  const deployed = await deployShopifyAppConfig(appPath);
  if (!deployed) {
    logger.warn("Shopify CLI could not deploy the app config automatically. The OAuth flow may fail until scopes and redirect URLs are applied in Shopify.");
  }

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

export async function deployShopifyAppConfig(appPath = path.dirname(localAppConfigPath)): Promise<boolean> {
  const result = await runShopify([
    "app",
    "deploy",
    "--path",
    appPath,
    "--allow-updates",
    "--no-build",
    "--message",
    "Hazify local agent setup"
  ]);
  if (result.ok) return true;
  if (result.stdout || result.stderr) logger.muted([result.stdout, result.stderr].filter(Boolean).join("\n"));
  return false;
}

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function parseShopifyEnv(text: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim().replace(/^export\s+/, "");
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;
    values[match[1]] = stripQuotes(match[2]);
  }
  return values;
}

function credentialsFromEnv(values: Record<string, string>): ShopifyAppCredentials | null {
  const clientId = values.SHOPIFY_API_KEY || values.SHOPIFY_CLIENT_ID || values.SHOPIFY_API_CLIENT_ID;
  const clientSecret = values.SHOPIFY_API_SECRET || values.SHOPIFY_API_SECRET_KEY || values.SHOPIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

async function pullShopifyAppEnv(appPath: string): Promise<Record<string, string>> {
  const show = await runShopify(["app", "env", "show", "--path", appPath]);
  const showValues = parseShopifyEnv(show.stdout);
  if (show.ok && credentialsFromEnv(showValues)) return showValues;

  const pull = await runShopify(["app", "env", "pull", "--path", appPath, "--env-file", localAppEnvPath]);
  if (pull.ok && await fs.pathExists(localAppEnvPath)) {
    return parseShopifyEnv(await fs.readFile(localAppEnvPath, "utf8"));
  }

  const output = [show.stderr, pull.stderr].filter(Boolean).join("\n");
  if (output) logger.muted(output);
  throw new Error("Shopify CLI did not return app credentials. Re-run npm run data:connect after Shopify app linking completes.");
}

export async function provisionShopifyAppCredentials(
  storeDomain: string,
  scopes: string[]
): Promise<ShopifyAppCredentials> {
  await createOrLinkShopifyApp(storeDomain, scopes);
  const appPath = path.dirname(localAppConfigPath);
  const env = await pullShopifyAppEnv(appPath);
  const credentials = credentialsFromEnv(env);
  if (!credentials) throw new Error("Shopify app credentials were not found in Shopify CLI env output.");
  const location = await storeShopifyAppCredentials(storeDomain, credentials);
  logger.success(`Shopify app credentials stored using ${location}.`);
  return credentials;
}

export function explainManualFallback(storeDomain: string, scopes: string[]): string {
  return `Shopify app setup is the primary data-agent auth route.

If setup pauses in the browser:
1. Approve Shopify login or app access.
2. Confirm these Admin API permissions if Shopify shows them: ${scopes.join(",")}
3. Confirm this redirect URL is present: ${OAUTH_CALLBACK_URL}
4. Install the app on ${storeDomain} when Shopify shows the approval screen.

Legacy fallback: if Shopify app setup is blocked by account permissions, run npm run data:legacy-store-auth.`;
}
