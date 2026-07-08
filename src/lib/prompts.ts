import inquirer from "inquirer";
import type { AiClient, AuthMode } from "./filesystem.js";
import { normalizeThemeReference } from "./themeWorkspace.js";
import { CAPABILITY_SCOPES, DEFAULT_CAPABILITIES, type CapabilityName, uniqueScopes } from "./scopes.js";
import { validateStoreDomain } from "./validation.js";

export function ensureInteractive(action: string): void {
  if (process.stdin.isTTY) return;
  throw new Error(`${action} requires an interactive terminal. Run npm run setup:agent with --store, or configure .hazify/config.local.json first.`);
}

export async function selectAiClients(detected: {
  codexInstalled: boolean;
  claudeInstalled: boolean;
  opencodeInstalled: boolean;
}): Promise<AiClient[]> {
  ensureInteractive("Choosing AI clients");
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
  ensureInteractive("Entering the Shopify store domain");
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

export async function askAuthMode(
  options: { includeThemeOnly?: boolean; includeStoreAuth?: boolean; includeAdvanced?: boolean } = {}
): Promise<AuthMode> {
  ensureInteractive("Choosing the Shopify auth mode");
  const includeThemeOnly = options.includeThemeOnly ?? true;
  const includeStoreAuth = options.includeStoreAuth ?? false;
  const includeAdvanced = options.includeAdvanced ?? false;
  const choices = [
    { name: "One-time Shopify OAuth install (recommended permanent data agent)", value: "shopify-oauth-offline" }
  ];
  if (includeAdvanced) {
    choices.push(
      { name: "Advanced: existing Admin API access token", value: "admin-api-token" },
      { name: "Advanced: legacy local OAuth", value: "shopify-cli-oauth" }
    );
  }
  if (includeStoreAuth) {
    choices.push({ name: "Legacy: Shopify CLI store auth (temporary token fallback)", value: "shopify-store-auth" });
  }
  if (includeThemeOnly) {
    choices.push({ name: "Theme-only mode", value: "theme-only" });
  }

  const answers = await inquirer.prompt<{ authMode: AuthMode }>([
    {
      type: "select",
      name: "authMode",
      message: "How do you want to connect to Shopify Admin API?",
      choices
    }
  ]);
  return answers.authMode;
}

export async function askCapabilityScopes(): Promise<string[]> {
  ensureInteractive("Choosing Shopify access scopes");
  const answers = await inquirer.prompt<{ capabilities: CapabilityName[] }>([
    {
      type: "checkbox",
      name: "capabilities",
      message: "What should the data agent be allowed to do?",
      choices: Object.keys(CAPABILITY_SCOPES).map((name) => ({ name, value: name })),
      default: DEFAULT_CAPABILITIES
    }
  ]);
  return uniqueScopes(answers.capabilities);
}

export async function askHidden(message: string): Promise<string> {
  ensureInteractive(message);
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

export async function askInput(message: string, defaultValue = ""): Promise<string> {
  ensureInteractive(message);
  const answers = await inquirer.prompt<{ value: string }>([
    {
      type: "input",
      name: "value",
      message,
      default: defaultValue,
      validate(value: string) {
        return value.trim().length > 0 || "This value is required.";
      }
    }
  ]);
  return answers.value.trim();
}

export async function askConfirm(message: string, defaultValue = true): Promise<boolean> {
  ensureInteractive(message);
  const answers = await inquirer.prompt<{ value: boolean }>([
    { type: "confirm", name: "value", message, default: defaultValue }
  ]);
  return answers.value;
}

export async function askThemeId(rawOutput?: string): Promise<{ id: string; name: string | null }> {
  ensureInteractive("Choosing a Shopify theme");
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
