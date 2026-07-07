import fs from "fs-extra";
import path from "node:path";
import { hazifyDir, localConfigPath, repoRoot, themePath } from "./paths.js";

export type AuthMode = "shopify-cli-oauth" | "admin-api-token" | "theme-only";
export type AiClient = "codex" | "claude" | "opencode";

export interface LocalConfig {
  storeDomain: string;
  themePath: string;
  selectedThemeId: string | null;
  selectedThemeName: string | null;
  configuredClients: AiClient[];
  authMode: AuthMode;
  scopes: string[];
  createdAt: string;
  updatedAt: string;
}

export async function ensureWorkspaceDirs(): Promise<void> {
  await fs.ensureDir(hazifyDir);
  await fs.ensureDir(themePath);
  await fs.ensureFile(path.join(themePath, ".gitkeep"));
}

export async function readLocalConfig(): Promise<LocalConfig | null> {
  if (!(await fs.pathExists(localConfigPath))) return null;
  return fs.readJson(localConfigPath) as Promise<LocalConfig>;
}

export async function writeLocalConfig(config: LocalConfig): Promise<void> {
  await fs.ensureDir(path.dirname(localConfigPath));
  await fs.writeJson(localConfigPath, config, { spaces: 2 });
}

export async function upsertLocalConfig(
  patch: Partial<Omit<LocalConfig, "createdAt" | "updatedAt">>
): Promise<LocalConfig> {
  const existing = await readLocalConfig();
  const now = new Date().toISOString();
  const config: LocalConfig = {
    storeDomain: existing?.storeDomain ?? "",
    themePath: existing?.themePath ?? "./theme",
    selectedThemeId: existing?.selectedThemeId ?? null,
    selectedThemeName: existing?.selectedThemeName ?? null,
    configuredClients: existing?.configuredClients ?? [],
    authMode: existing?.authMode ?? "theme-only",
    scopes: existing?.scopes ?? [],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    ...patch
  };
  await writeLocalConfig(config);
  return config;
}

export async function writeTextFile(filePath: string, content: string): Promise<void> {
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content.endsWith("\n") ? content : `${content}\n`, "utf8");
}

export function fromRoot(...parts: string[]): string {
  return path.join(repoRoot, ...parts);
}
