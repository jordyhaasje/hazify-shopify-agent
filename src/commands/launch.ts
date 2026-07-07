import inquirer from "inquirer";
import { setupCommand } from "./setup.js";
import { doctorCommand } from "./doctor.js";
import { authCommand } from "./auth.js";
import { configureCommand } from "./configure.js";
import { readLocalConfig, upsertLocalConfig } from "../lib/filesystem.js";
import { logger } from "../lib/logger.js";
import { askConfirm, askStoreDomain, askThemeId } from "../lib/prompts.js";
import { themePath } from "../lib/paths.js";
import { listThemes, pullTheme, runThemeCheck, startThemeDev } from "../lib/themeWorkspace.js";

type LaunchAction =
  | "agent-setup"
  | "guided-setup"
  | "theme"
  | "data-agent"
  | "doctor"
  | "configure"
  | "theme-dev"
  | "exit";

async function getConfiguredStore(): Promise<string> {
  const config = await readLocalConfig();
  return config?.storeDomain || askStoreDomain();
}

async function connectTheme(): Promise<void> {
  const storeDomain = await getConfiguredStore();
  const themes = await listThemes(storeDomain);

  if (!themes.ok) {
    logger.warn("Could not list themes automatically. Shopify CLI may ask you to complete browser login first.");
    logger.muted(themes.error || themes.raw);
  }

  let selected: { id: string; name: string | null };
  if (themes.themes.length) {
    const answer = await inquirer.prompt<{ theme: { id: string; name: string } }>([
      {
        type: "select",
        name: "theme",
        message: "Which Shopify theme should Hazify use?",
        choices: themes.themes.map((theme) => ({
          name: `${theme.name} (${theme.role ?? "unknown role"}, ${theme.id})`,
          value: theme
        }))
      }
    ]);
    selected = { id: answer.theme.id, name: answer.theme.name };
  } else {
    selected = await askThemeId(themes.raw || themes.error);
  }

  const exitCode = await pullTheme(storeDomain, selected.id, themePath);
  if (exitCode !== 0) {
    process.exitCode = exitCode;
    return;
  }

  await upsertLocalConfig({
    storeDomain,
    selectedThemeId: selected.id,
    selectedThemeName: selected.name,
    themePath: "./theme"
  });

  if (await askConfirm("Run Theme Check now?", true)) {
    process.exitCode = await runThemeCheck(themePath);
  }
}

async function agentSetupFromLauncher(): Promise<void> {
  const existing = await readLocalConfig();
  const storeDomain = existing?.storeDomain || (await askStoreDomain());
  await setupCommand({
    agent: true,
    clients: "all",
    store: storeDomain,
    authMode: existing?.authMode ?? "theme-only"
  });
}

export async function launchCommand(): Promise<void> {
  logger.title("Hazify Shopify Agent Launcher");
  let running = true;

  while (running) {
    const answer = await inquirer.prompt<{ action: LaunchAction }>([
      {
        type: "select",
        name: "action",
        message: "What do you want to do?",
        choices: [
          { name: "Set up this workspace for coding agents", value: "agent-setup" },
          { name: "Run guided human setup wizard", value: "guided-setup" },
          { name: "Choose and pull a Shopify theme", value: "theme" },
          { name: "Enable Shopify data agent access", value: "data-agent" },
          { name: "Run doctor checks", value: "doctor" },
          { name: "Regenerate MCP/client configs", value: "configure" },
          { name: "Start theme dev preview", value: "theme-dev" },
          { name: "Exit", value: "exit" }
        ]
      }
    ]);

    switch (answer.action) {
      case "agent-setup":
        await agentSetupFromLauncher();
        break;
      case "guided-setup":
        await setupCommand();
        break;
      case "theme":
        await connectTheme();
        break;
      case "data-agent":
        await authCommand();
        break;
      case "doctor":
        await doctorCommand();
        break;
      case "configure":
        await configureCommand();
        break;
      case "theme-dev": {
        const storeDomain = await getConfiguredStore();
        process.exitCode = await startThemeDev(storeDomain, themePath);
        running = false;
        break;
      }
      case "exit":
        running = false;
        break;
    }
  }
}
