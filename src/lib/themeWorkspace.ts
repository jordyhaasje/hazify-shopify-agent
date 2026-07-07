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
  const jsonResult = await runShopify(["theme", "list", "--store", storeDomain, "--json"]);
  if (jsonResult.ok) {
    const parsed = parseThemeListJson(jsonResult.stdout);
    if (parsed.length) {
      return {
        ok: true,
        themes: parsed,
        raw: jsonResult.stdout,
        error: ""
      };
    }
  }

  const result = await runShopify(["theme", "list", "--store", storeDomain, "--no-color"]);
  const raw = [result.stdout, result.stderr].filter(Boolean).join("\n");
  return {
    ok: result.ok,
    themes: parseThemeList(raw),
    raw,
    error: result.ok ? "" : raw
  };
}

export function normalizeThemeReference(input: string): string {
  const trimmed = input.trim();
  const hashId = trimmed.match(/^#?(\d{5,})$/);
  if (hashId) return hashId[1];

  const pastedLineId = trimmed.match(/\b#?(\d{5,})\b/);
  if (pastedLineId && /^(#?\d{5,}|.*\(\s*#?\d{5,}.*\).*)$/.test(trimmed)) {
    return pastedLineId[1];
  }

  return trimmed.replace(/^#(?=\d)/, "");
}

export function parseThemeListJson(output: string): ShopifyTheme[] {
  try {
    const data = JSON.parse(output) as unknown;
    const themes = Array.isArray(data)
      ? data
      : typeof data === "object" && data !== null && Array.isArray((data as { themes?: unknown }).themes)
        ? (data as { themes: unknown[] }).themes
        : [];

    return themes
      .map((item): ShopifyTheme | null => {
        if (typeof item !== "object" || item === null) return null;
        const record = item as Record<string, unknown>;
        const id = record.id ?? record.themeId;
        const name = record.name;
        const role = record.role;
        if (id === undefined || id === null) return null;
        return {
          id: String(id).replace(/^#/, ""),
          name: typeof name === "string" && name.trim() ? name : `Theme ${id}`,
          role: typeof role === "string" ? role : null
        };
      })
      .filter((theme): theme is ShopifyTheme => Boolean(theme));
  } catch {
    return [];
  }
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
  return runShopifyInteractive([
    "theme",
    "pull",
    "--store",
    storeDomain,
    "--theme",
    normalizeThemeReference(themeId),
    "--path",
    targetPath
  ]);
}

export async function runThemeCheck(themePath: string): Promise<number> {
  return runShopifyInteractive(["theme", "check", "--path", themePath]);
}

export async function startThemeDev(storeDomain: string, themePath: string): Promise<number> {
  return runShopifyInteractive(["theme", "dev", "--store", storeDomain, "--path", themePath]);
}
