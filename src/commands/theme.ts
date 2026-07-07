import { Command } from "commander";
import { readLocalConfig, upsertLocalConfig } from "../lib/filesystem.js";
import { logger } from "../lib/logger.js";
import { askStoreDomain, askThemeId } from "../lib/prompts.js";
import { themePath } from "../lib/paths.js";
import { listThemes, pullTheme, runThemeCheck, startThemeDev } from "../lib/themeWorkspace.js";

async function getStoreDomain(): Promise<string> {
  const config = await readLocalConfig();
  return config?.storeDomain || askStoreDomain();
}

export function themeCommand(): Command {
  const command = new Command("theme").description("Work with the configured Shopify theme workspace.");

  command
    .command("list")
    .description("List remote Shopify themes for the configured store.")
    .action(async () => {
      const storeDomain = await getStoreDomain();
      const result = await listThemes(storeDomain);
      if (result.raw) console.log(result.raw);
      if (!result.ok) process.exitCode = 1;
    });

  command
    .command("pull")
    .description("Pull a remote theme into ./theme.")
    .option("--theme <id>", "Theme ID to pull")
    .action(async (options: { theme?: string }) => {
      const storeDomain = await getStoreDomain();
      let themeId = options.theme;
      let themeName: string | null = null;
      if (!themeId) {
        const listed = await listThemes(storeDomain);
        const selected = await askThemeId(listed.raw);
        themeId = selected.id;
        themeName = selected.name;
      }
      const exitCode = await pullTheme(storeDomain, themeId, themePath);
      if (exitCode === 0) await upsertLocalConfig({ storeDomain, selectedThemeId: themeId, selectedThemeName: themeName });
      process.exitCode = exitCode;
    });

  command
    .command("check")
    .description("Run Shopify Theme Check against ./theme.")
    .action(async () => {
      process.exitCode = await runThemeCheck(themePath);
    });

  command
    .command("dev")
    .description("Start Shopify theme development preview for ./theme.")
    .action(async () => {
      const storeDomain = await getStoreDomain();
      logger.warn("This starts a development preview. Do not push to live unless explicitly approved.");
      process.exitCode = await startThemeDev(storeDomain, themePath);
    });

  return command;
}
