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

const APP_NAME = "Hazify Shopify Agent";

export async function ensureShopifyCliLogin(storeDomain: string): Promise<boolean> {
  const check = await runShopify(["theme", "list", "--store", storeDomain]);
  if (check.ok) return true;
  logger.warn("Shopify CLI could not verify store access yet. The next command may open a browser login flow.");
  const exitCode = await runShopifyInteractive(["theme", "list", "--store", storeDomain]);
  return exitCode === 0;
}

export async function createOrLinkShopifyApp(storeDomain: string, scopes: string[]): Promise<boolean> {
  logger.step("One-time Shopify app setup");
  logger.info("Hazify will use Shopify CLI to create or link the app. Do not create a Custom App manually in Shopify Admin.");
  logger.info("If Shopify opens a browser window, approve the Shopify login or app connection there, then return here.");

  if (!(await isShopifyCliInstalled())) {
    logger.warn("Shopify CLI is not installed. Installing it now with npm.");
    const exitCode = await installShopifyCliGlobal();
    if (exitCode !== 0) throw new Error("Shopify CLI installation failed.");
  }

  const appPath = path.dirname(localAppConfigPath);
  await ensureLocalShopifyAppProject(appPath);
  await writeShopifyAppConfig(storeDomain, scopes);

  const linkExitCode = await runShopifyInteractive(["app", "config", "link", "--path", appPath]);
  if (linkExitCode !== 0) throw new Error("Shopify app creation/linking did not complete.");

  const linkedClientId = await readLinkedClientId();
  await writeShopifyAppConfig(storeDomain, scopes, { clientId: linkedClientId });
  await checkAppConfig(appPath);
  const deployed = await deployShopifyAppConfig(appPath, linkedClientId);
  if (!deployed) {
    logger.warn("Shopify CLI could not apply the app config automatically. Re-run npm run data:connect after checking Shopify CLI login and account permissions.");
  }

  return true;
}

async function ensureLocalShopifyAppProject(appPath: string): Promise<void> {
  if (await fs.pathExists(path.join(appPath, "package.json"))) return;

  await fs.ensureDir(appPath);
  logger.info("Creating the local Shopify app project with Shopify CLI.");
  const initExitCode = await runShopifyInteractive([
    "app",
    "init",
    "--name",
    APP_NAME,
    "--template",
    "none",
    "--path",
    appPath,
    "--package-manager",
    "npm"
  ]);

  if (initExitCode !== 0) {
    logger.warn("Shopify CLI app creation did not finish. Trying the app-link flow next.");
  }
}

async function readLinkedClientId(): Promise<string> {
  if (!(await fs.pathExists(localAppConfigPath))) return "";
  const content = await fs.readFile(localAppConfigPath, "utf8");
  const match = content.match(/^client_id\s*=\s*"([^"]*)"/m);
  return match?.[1] ?? "";
}

export async function writeShopifyAppConfig(
  storeDomain: string,
  scopes: string[],
  options: { clientId?: string } = {}
): Promise<string> {
  const filePath = localAppConfigPath;
  const content = `# Local Shopify app config template for Hazify Shopify Agent.
# Shopify CLI login enables CLI operations. Admin API store data requires an app/token auth flow.

name = "${APP_NAME}"
client_id = "${options.clientId ?? ""}"
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

export async function deployShopifyAppConfig(appPath = path.dirname(localAppConfigPath), clientId = ""): Promise<boolean> {
  const args = [
    "app",
    "deploy",
    "--path",
    appPath,
    "--allow-updates",
    "--no-build",
    "--message",
    "Hazify local agent setup"
  ];
  if (clientId) args.push("--client-id", clientId);
  const result = await runShopify(args);
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
  const clientId = await readLinkedClientId();
  const showArgs = ["app", "env", "show", "--path", appPath];
  if (clientId) showArgs.push("--client-id", clientId);
  const show = await runShopify(showArgs);
  const showValues = parseShopifyEnv(show.stdout);
  if (show.ok && credentialsFromEnv(showValues)) return showValues;

  const pullArgs = ["app", "env", "pull", "--path", appPath, "--env-file", localAppEnvPath];
  if (clientId) pullArgs.push("--client-id", clientId);
  const pull = await runShopify(pullArgs);
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

export function explainProvisioningRecovery(storeDomain: string, scopes: string[]): string {
  return `Shopify CLI app setup is the primary data-agent auth route.

If setup pauses in the browser:
1. Approve Shopify login or app access.
2. Confirm these Admin API permissions if Shopify shows them: ${scopes.join(",")}
3. Confirm this redirect URL is present: ${OAUTH_CALLBACK_URL}
4. Install the app on ${storeDomain} when Shopify shows the approval screen.

Do not ask the merchant to create an app manually in Shopify Admin. If Shopify CLI cannot provision the app, explain that the store owner may need app-development permissions or help from the store admin, then retry npm run data:connect.

Technical fallback for maintainers only: npm run data:legacy-store-auth.`;
}
