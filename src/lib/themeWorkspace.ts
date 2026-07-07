import fs from "fs-extra";
import { runShopify, runShopifyInteractive } from "./shopifyCli.js";

export interface ShopifyTheme {
  id: string;
  name: string;
  role: string | null;
}

export interface ThemeListResult {
  ok: boolean;
  themes: ShopifyTheme[];
  raw: string;
  error: string;
}

export async function listThemes(storeDomain: string): Promise<ThemeListResult> {
  const result = await runShopify(["theme", "list", "--store", storeDomain]);
  const raw = [result.stdout, result.stderr].filter(Boolean).join("\n");
  return {
    ok: result.ok,
    themes: parseThemeList(raw),
    raw,
    error: result.ok ? "" : raw
  };
}

export function parseThemeList(output: string): ShopifyTheme[] {
  const themes: ShopifyTheme[] = [];
  for (const line of output.split(/\r?\n/)) {
    const clean = line.replace(/\u001b\[[0-9;]*m/g, "").trim();
    if (!clean || /^(name|theme|---|\|)/i.test(clean)) continue;
    const idMatch = clean.match(/\b(\d{5,})\b/);
    if (!idMatch) continue;
    const id = idMatch[1];
    const roleMatch = clean.match(/\b(live|main|unpublished|development|demo)\b/i);
    const role = roleMatch ? roleMatch[1].toLowerCase() : null;
    const name = clean
      .replace(id, "")
      .replace(/\b(live|main|unpublished|development|demo)\b/gi, "")
      .replace(/[│|*]/g, "")
      .trim();
    themes.push({ id, name: name || `Theme ${id}`, role });
  }
  return themes;
}

export async function pullTheme(storeDomain: string, themeId: string, targetPath: string): Promise<number> {
  await fs.ensureDir(targetPath);
  return runShopifyInteractive(["theme", "pull", "--store", storeDomain, "--theme", themeId, "--path", targetPath]);
}

export async function runThemeCheck(themePath: string): Promise<number> {
  return runShopifyInteractive(["theme", "check", "--path", themePath]);
}

export async function startThemeDev(storeDomain: string, themePath: string): Promise<number> {
  return runShopifyInteractive(["theme", "dev", "--store", storeDomain, "--path", themePath]);
}
