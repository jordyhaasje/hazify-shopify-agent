import crypto from "node:crypto";
import path from "node:path";
import fs from "fs-extra";
import { encryptedCredentialsKeyPath, encryptedCredentialsPath } from "./paths.js";
import { askHidden } from "./prompts.js";
import { logger } from "./logger.js";

const SERVICE = "hazify-shopify-agent";
const ADMIN_API_TOKEN_SUFFIX = "admin-api-token";
const APP_CLIENT_ID_SUFFIX = "shopify-app-client-id";
const APP_CLIENT_SECRET_SUFFIX = "shopify-app-client-secret";

interface KeytarLike {
  getPassword(service: string, account: string): Promise<string | null>;
  setPassword(service: string, account: string, password: string): Promise<void>;
  deletePassword(service: string, account: string): Promise<boolean>;
}

interface EncryptedFile {
  version: 1;
  salt: string;
  iv: string;
  authTag: string;
  data: string;
}

async function loadKeytar(): Promise<KeytarLike | null> {
  try {
    const dynamicImport = new Function("specifier", "return import(specifier)") as (
      specifier: string
    ) => Promise<KeytarLike | { default?: KeytarLike }>;
    const mod = await dynamicImport("keytar");
    const keytar = "default" in mod && mod.default ? mod.default : mod;
    if (!keytar || typeof (keytar as KeytarLike).setPassword !== "function") return null;
    return keytar as KeytarLike;
  } catch {
    return null;
  }
}

async function readLocalPassphraseFile(): Promise<string | null> {
  if (!(await fs.pathExists(encryptedCredentialsKeyPath))) return null;
  return (await fs.readFile(encryptedCredentialsKeyPath, "utf8")).trim() || null;
}

async function writeLocalPassphraseFile(passphrase: string): Promise<void> {
  await fs.ensureDir(path.dirname(encryptedCredentialsKeyPath));
  await fs.writeFile(encryptedCredentialsKeyPath, `${passphrase}\n`, { encoding: "utf8", mode: 0o600 });
  await fs.chmod(encryptedCredentialsKeyPath, 0o600);
}

async function getPassphrase({ confirm = false }: { confirm?: boolean } = {}): Promise<string> {
  const envPassphrase = process.env.HAZIFY_CREDENTIAL_PASSPHRASE;
  if (envPassphrase) return envPassphrase;
  const localPassphrase = await readLocalPassphraseFile();
  if (localPassphrase) {
    process.env.HAZIFY_CREDENTIAL_PASSPHRASE = localPassphrase;
    return localPassphrase;
  }
  if (!process.stdin.isTTY) {
    if (await fs.pathExists(encryptedCredentialsPath)) {
      throw new Error("Encrypted credentials already exist, but no readable passphrase was found. Set HAZIFY_CREDENTIAL_PASSPHRASE or restore .hazify/credentials.key.");
    }
    const generated = crypto.randomBytes(32).toString("base64url");
    await writeLocalPassphraseFile(generated);
    process.env.HAZIFY_CREDENTIAL_PASSPHRASE = generated;
    logger.warn("Running without an interactive terminal. A local encrypted-credential key was generated under .hazify/.");
    logger.warn("The file is gitignored. Do not share or commit files named .hazify/credentials*.");
    return generated;
  }
  const first = await askHidden("Create or enter local credential encryption passphrase:");
  if (!confirm) {
    process.env.HAZIFY_CREDENTIAL_PASSPHRASE = first;
    return first;
  }
  const second = await askHidden("Confirm local credential encryption passphrase:");
  if (first !== second) {
    throw new Error("Credential passphrases did not match.");
  }
  process.env.HAZIFY_CREDENTIAL_PASSPHRASE = first;
  return first;
}

function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return crypto.scryptSync(passphrase, salt, 32);
}

async function readEncryptedMap(passphrase: string): Promise<Record<string, string>> {
  if (!(await fs.pathExists(encryptedCredentialsPath))) return {};
  const encrypted = (await fs.readJson(encryptedCredentialsPath)) as EncryptedFile;
  const salt = Buffer.from(encrypted.salt, "base64");
  const iv = Buffer.from(encrypted.iv, "base64");
  const authTag = Buffer.from(encrypted.authTag, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", deriveKey(passphrase, salt), iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encrypted.data, "base64")),
    decipher.final()
  ]).toString("utf8");
  return JSON.parse(plaintext) as Record<string, string>;
}

async function writeEncryptedMap(passphrase: string, values: Record<string, string>): Promise<void> {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", deriveKey(passphrase, salt), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(values), "utf8"), cipher.final()]);
  const encrypted: EncryptedFile = {
    version: 1,
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    data: data.toString("base64")
  };
  await fs.writeJson(encryptedCredentialsPath, encrypted, { spaces: 2 });
  await fs.chmod(encryptedCredentialsPath, 0o600);
}

export async function storeSecret(account: string, value: string): Promise<"keytar" | "encrypted-file"> {
  const keytar = await loadKeytar();
  if (keytar) {
    await keytar.setPassword(SERVICE, account, value);
    return "keytar";
  }

  const passphrase = await getPassphrase({ confirm: !(await fs.pathExists(encryptedCredentialsPath)) });
  const values = await readEncryptedMap(passphrase);
  values[account] = value;
  await writeEncryptedMap(passphrase, values);
  return "encrypted-file";
}

export function adminApiTokenAccount(storeDomain: string): string {
  return `${storeDomain}:${ADMIN_API_TOKEN_SUFFIX}`;
}

export async function storeAdminApiToken(
  storeDomain: string,
  token: string
): Promise<"keytar" | "encrypted-file"> {
  return storeSecret(adminApiTokenAccount(storeDomain), token);
}

export function shopifyAppClientIdAccount(storeDomain: string): string {
  return `${storeDomain}:${APP_CLIENT_ID_SUFFIX}`;
}

export function shopifyAppClientSecretAccount(storeDomain: string): string {
  return `${storeDomain}:${APP_CLIENT_SECRET_SUFFIX}`;
}

export async function storeShopifyAppCredentials(
  storeDomain: string,
  credentials: { clientId: string; clientSecret: string }
): Promise<"keytar" | "encrypted-file"> {
  const location = await storeSecret(shopifyAppClientIdAccount(storeDomain), credentials.clientId);
  await storeSecret(shopifyAppClientSecretAccount(storeDomain), credentials.clientSecret);
  return location;
}

export async function readSecret(account: string, { prompt = true }: { prompt?: boolean } = {}): Promise<string | null> {
  const keytar = await loadKeytar();
  if (keytar) return keytar.getPassword(SERVICE, account);
  if (!(await fs.pathExists(encryptedCredentialsPath))) return null;
  if (!prompt && !process.env.HAZIFY_CREDENTIAL_PASSPHRASE && !(await fs.pathExists(encryptedCredentialsKeyPath))) return null;
  const passphrase = await getPassphrase();
  const values = await readEncryptedMap(passphrase);
  return values[account] ?? null;
}

export async function readAdminApiToken(
  storeDomain: string,
  options: { prompt?: boolean } = {}
): Promise<string | null> {
  return readSecret(adminApiTokenAccount(storeDomain), options);
}

export async function readShopifyAppCredentials(
  storeDomain: string,
  options: { prompt?: boolean } = {}
): Promise<{ clientId: string; clientSecret: string } | null> {
  const [clientId, clientSecret] = await Promise.all([
    readSecret(shopifyAppClientIdAccount(storeDomain), options),
    readSecret(shopifyAppClientSecretAccount(storeDomain), options)
  ]);
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export async function hasSecret(account: string): Promise<boolean> {
  const keytar = await loadKeytar();
  if (keytar) return Boolean(await keytar.getPassword(SERVICE, account));
  if (!(await fs.pathExists(encryptedCredentialsPath))) return false;
  const localPassphrase = process.env.HAZIFY_CREDENTIAL_PASSPHRASE || await readLocalPassphraseFile();
  if (!localPassphrase) return false;
  try {
    const values = await readEncryptedMap(localPassphrase);
    return Boolean(values[account]);
  } catch {
    return false;
  }
}

export async function hasAdminApiToken(storeDomain: string): Promise<boolean> {
  return hasSecret(adminApiTokenAccount(storeDomain));
}
