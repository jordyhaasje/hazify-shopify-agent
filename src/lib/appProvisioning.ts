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

interface ShopifyOrganization {
  id: string;
  gid?: string;
  name: string;
}

const APP_NAME = "Hazify Store Assistant";

export async function ensureShopifyCliLogin(storeDomain: string): Promise<boolean> {
  const check = await runShopify(["theme", "list", "--store", storeDomain]);
  if (check.ok) return true;
  logger.warn("Shopify CLI could not verify store access yet. The next command may open a browser login flow.");
  const exitCode = await runShopifyInteractive(["theme", "list", "--store", storeDomain]);
  return exitCode === 0;
}

async function listOrganizations(): Promise<ShopifyOrganization[]> {
  const result = await runShopify(["organization", "list", "--json"]);
  if (!result.ok) return [];
  try {
    const parsed = JSON.parse(result.stdout) as { organizations?: ShopifyOrganization[] } | ShopifyOrganization[];
    if (Array.isArray(parsed)) return parsed;
    return parsed.organizations ?? [];
  } catch {
    return [];
  }
}

async function resolveOrganizationId(): Promise<string | null> {
  if (process.env.SHOPIFY_ORG_ID) {
    logger.info(`Using Shopify organization from SHOPIFY_ORG_ID: ${process.env.SHOPIFY_ORG_ID}`);
    return process.env.SHOPIFY_ORG_ID;
  }

  const orgs = await listOrganizations();
  if (orgs.length === 0) {
    if (!process.stdin.isTTY) {
      throw new Error("No Shopify organization was detected. Complete Shopify CLI browser login, make sure the account can create apps, then rerun npm run data:connect.");
    }
    return null;
  }
  if (orgs.length === 1) {
    logger.info(`Using Shopify organization: ${orgs[0].name} (${orgs[0].id})`);
    return orgs[0].id;
  }

  const orgList = orgs.map((org) => `  ${org.name} (${org.id})`).join("\n");
  if (!process.stdin.isTTY) {
    throw new Error(`Multiple Shopify organizations were found. Re-run with SHOPIFY_ORG_ID set to the correct organization ID:\n${orgList}`);
  }

  logger.info("Multiple Shopify organizations found. Shopify CLI will ask which one to use. To skip this prompt, set SHOPIFY_ORG_ID.");
  logger.muted(orgList);
  return null;
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
  await flattenAppProject(appPath);
  await cleanupTemplateArtifacts(appPath);

  const existingClientId = await readLinkedClientId();
  await writeShopifyAppConfig(storeDomain, scopes, { clientId: existingClientId });

  const linkArgs = ["app", "config", "link", "--path", appPath];
  if (existingClientId) linkArgs.push("--client-id", existingClientId);
  const linkExitCode = await runShopifyInteractive(linkArgs);
  if (linkExitCode !== 0) {
    const recoveredClientId = await readLinkedClientId();
    if (!recoveredClientId) throw new Error("Shopify app creation/linking did not complete.");
    logger.info("App already linked. Continuing with existing client_id.");
  }

  const linkedClientId = await readLinkedClientId();
  if (!linkedClientId) {
    throw new Error("Shopify app linking completed without a client_id. Re-run npm run data:connect after selecting or creating the Hazify Store Assistant app.");
  }
  await writeShopifyAppConfig(storeDomain, scopes, { clientId: linkedClientId });
  await checkAppConfig(appPath);
  const deployed = await deployShopifyAppConfig(appPath, linkedClientId);
  if (!deployed) {
    throw new Error("Shopify CLI could not apply the app config automatically. Re-run npm run data:connect after checking Shopify CLI login and account permissions.");
  }

  return true;
}

async function ensureLocalShopifyAppProject(appPath: string): Promise<void> {
  if (await isShopifyAppProject(appPath)) return;
  if ((await findNestedAppProjects(appPath)).length) return;

  await fs.ensureDir(appPath);
  await fs.emptyDir(appPath);
  const initArgs = [
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
  ];
  const orgId = await resolveOrganizationId();
  if (orgId) {
    logger.info("Creating the local Shopify app project with Shopify CLI.");
    const initResult = await runShopify([...initArgs, "--organization-id", orgId]);
    if (initResult.ok) return;
    if (initResult.stderr || initResult.stdout) logger.muted([initResult.stdout, initResult.stderr].filter(Boolean).join("\n"));
    logger.warn("Non-interactive Shopify app creation failed. Trying interactive fallback.");
  } else {
    logger.warn("No Shopify organization was detected. Trying interactive app creation.");
  }

  const interactiveArgs = orgId ? [...initArgs, "--organization-id", orgId] : initArgs;
  const initExitCode = await runShopifyInteractive(interactiveArgs);
  if (initExitCode !== 0) {
    logger.warn("Shopify CLI app creation did not finish. Trying the app-link flow next.");
  }
}

async function flattenAppProject(appPath: string): Promise<void> {
  if (await isShopifyAppProject(appPath)) return;
  const candidates = await findNestedAppProjects(appPath);
  if (candidates.length === 0) return;
  if (candidates.length > 1) {
    throw new Error(`Shopify CLI created multiple app project directories under .hazify/app. Remove .hazify/app and rerun npm run data:connect.`);
  }

  const nested = candidates[0];
  const nestedFiles = await fs.readdir(nested);
  logger.info(`Moving Shopify app project files from ${path.relative(appPath, nested)} into .hazify/app.`);
  for (const file of nestedFiles) {
    const src = path.join(nested, file);
    const dest = path.join(appPath, file);
    if (await fs.pathExists(dest)) await fs.remove(dest);
    await fs.move(src, dest, { overwrite: true });
  }
  await fs.remove(nested);
}

async function isShopifyAppProject(projectPath: string): Promise<boolean> {
  return (await fs.pathExists(path.join(projectPath, "package.json")))
    && (await fs.pathExists(path.join(projectPath, "shopify.app.toml")));
}

async function findNestedAppProjects(appPath: string): Promise<string[]> {
  if (!(await fs.pathExists(appPath))) return [];
  const entries = await fs.readdir(appPath, { withFileTypes: true });
  const ignoredDirs = new Set([".git", ".shopify", "node_modules"]);
  const candidates: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || ignoredDirs.has(entry.name)) continue;
    const candidatePath = path.join(appPath, entry.name);
    if (await isShopifyAppProject(candidatePath)) candidates.push(candidatePath);
  }
  return candidates;
}

async function cleanupTemplateArtifacts(appPath: string): Promise<void> {
  const extensionsPath = path.join(appPath, "extensions");
  if (await fs.pathExists(extensionsPath)) {
    logger.info("Removing template UI extensions not needed for API access.");
    await fs.remove(extensionsPath);
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
  const content = `# Local Shopify app config template for Hazify Store Assistant.
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
    await fs.chmod(localAppEnvPath, 0o600).catch(() => undefined);
    const values = parseShopifyEnv(await fs.readFile(localAppEnvPath, "utf8"));
    await fs.remove(localAppEnvPath).catch(() => undefined);
    return values;
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
