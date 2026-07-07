import crypto from "node:crypto";
import fs from "fs-extra";
import { encryptedCredentialsPath } from "./paths.js";
import { askHidden } from "./prompts.js";

const SERVICE = "hazify-shopify-agent";

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
    ) => Promise<KeytarLike>;
    return await dynamicImport("keytar");
  } catch {
    return null;
  }
}

async function getPassphrase({ confirm = false }: { confirm?: boolean } = {}): Promise<string> {
  const envPassphrase = process.env.HAZIFY_CREDENTIAL_PASSPHRASE;
  if (envPassphrase) return envPassphrase;
  const first = await askHidden("Create or enter local credential encryption passphrase:");
  if (!confirm) return first;
  const second = await askHidden("Confirm local credential encryption passphrase:");
  if (first !== second) {
    throw new Error("Credential passphrases did not match.");
  }
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

export async function readSecret(account: string, { prompt = true }: { prompt?: boolean } = {}): Promise<string | null> {
  const keytar = await loadKeytar();
  if (keytar) return keytar.getPassword(SERVICE, account);
  if (!(await fs.pathExists(encryptedCredentialsPath))) return null;
  if (!prompt && !process.env.HAZIFY_CREDENTIAL_PASSPHRASE) return null;
  const passphrase = await getPassphrase();
  const values = await readEncryptedMap(passphrase);
  return values[account] ?? null;
}

export async function hasSecret(account: string): Promise<boolean> {
  const keytar = await loadKeytar();
  if (keytar) return Boolean(await keytar.getPassword(SERVICE, account));
  if (!(await fs.pathExists(encryptedCredentialsPath))) return false;
  if (!process.env.HAZIFY_CREDENTIAL_PASSPHRASE) return true;
  try {
    const values = await readEncryptedMap(process.env.HAZIFY_CREDENTIAL_PASSPHRASE);
    return Boolean(values[account]);
  } catch {
    return true;
  }
}
