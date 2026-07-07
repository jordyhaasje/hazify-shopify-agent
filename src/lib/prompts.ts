import inquirer from "inquirer";
import type { AiClient, AuthMode } from "./filesystem.js";
import { normalizeThemeReference } from "./themeWorkspace.js";
import { validateStoreDomain } from "./validation.js";

export async function selectAiClients(detected: {
  codexInstalled: boolean;
  claudeInstalled: boolean;
  opencodeInstalled: boolean;
}): Promise<AiClient[]> {
  const choices = [
    { name: `Codex${detected.codexInstalled ? "" : " (CLI not on PATH; config only)"}`, value: "codex" },
    { name: `Claude Code${detected.claudeInstalled ? "" : " (CLI not on PATH; config only)"}`, value: "claude" },
    { name: `OpenCode${detected.opencodeInstalled ? "" : " (CLI not on PATH; config only)"}`, value: "opencode" }
  ];
  const answers = await inquirer.prompt<{ clients: AiClient[] }>([
    {
      type: "checkbox",
      name: "clients",
      message: "Which AI clients do you want to configure?",
      choices,
      default: choices.map((choice) => choice.value)
    }
  ]);
  return answers.clients;
}

export async function askStoreDomain(defaultValue?: string): Promise<string> {
  const answers = await inquirer.prompt<{ storeDomain: string }>([
    {
      type: "input",
      name: "storeDomain",
      message: "What is your Shopify store domain?",
      default: defaultValue,
      validate(value: string) {
        try {
          validateStoreDomain(value);
          return true;
        } catch (error) {
          return error instanceof Error ? error.message : "Invalid store domain";
        }
      },
      filter: (value: string) => validateStoreDomain(value)
    }
  ]);
  return answers.storeDomain;
}

export async function askAuthMode(): Promise<AuthMode> {
  const answers = await inquirer.prompt<{ authMode: AuthMode }>([
    {
      type: "list",
      name: "authMode",
      message: "How do you want to connect to Shopify Admin API?",
      choices: [
        { name: "Shopify CLI app provisioning / local OAuth", value: "shopify-cli-oauth" },
        { name: "Existing Admin API access token", value: "admin-api-token" },
        { name: "Theme-only mode", value: "theme-only" }
      ]
    }
  ]);
  return answers.authMode;
}

export async function askHidden(message: string): Promise<string> {
  const answers = await inquirer.prompt<{ value: string }>([
    {
      type: "password",
      name: "value",
      message,
      mask: "*",
      validate(value: string) {
        return value.trim().length > 0 || "This value is required.";
      }
    }
  ]);
  return answers.value.trim();
}

export async function askConfirm(message: string, defaultValue = true): Promise<boolean> {
  const answers = await inquirer.prompt<{ value: boolean }>([
    { type: "confirm", name: "value", message, default: defaultValue }
  ]);
  return answers.value;
}

export async function askThemeId(rawOutput?: string): Promise<{ id: string; name: string | null }> {
  if (rawOutput) {
    console.log("\nShopify CLI theme list output:\n");
    console.log(rawOutput);
  }
  const answers = await inquirer.prompt<{ id: string; name: string }>([
    {
      type: "input",
      name: "id",
      message: "Enter the theme ID to pull into ./theme:",
      validate(value: string) {
        return normalizeThemeReference(value).length > 0 || "Theme ID is required.";
      }
    },
    {
      type: "input",
      name: "name",
      message: "Theme name, optional:",
      default: ""
    }
  ]);
  return { id: normalizeThemeReference(answers.id), name: answers.name.trim() || null };
}
