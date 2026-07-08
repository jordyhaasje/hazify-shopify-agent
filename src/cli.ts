#!/usr/bin/env node
import { Command } from "commander";
import { setupCommand } from "./commands/setup.js";
import { doctorCommand } from "./commands/doctor.js";
import { authCommand } from "./commands/auth.js";
import { configureCommand } from "./commands/configure.js";
import { themeCommand } from "./commands/theme.js";
import { launchCommand } from "./commands/launch.js";
import { dataCommand } from "./commands/data.js";
import { logger } from "./lib/logger.js";

const program = new Command();

program
  .name("hazify-shopify-agent")
  .description("Local Shopify AI agent workspace setup and operations CLI.")
  .version("0.1.0");

program.command("launch").description("Open the interactive Hazify launcher.").action(launchCommand);
program
  .command("setup")
  .description("Run the interactive setup wizard.")
  .option("--agent", "Generate agent-ready configs and setup guide without interactive prompts.")
  .option("--clients <clients>", "Comma-separated clients: codex,claude,opencode, or all.", "all")
  .option("--store <store>", "Shopify store domain, for example example.myshopify.com.")
  .option("--auth-mode <mode>", "Auth mode: shopify-oauth-offline, admin-api-token, shopify-store-auth, or theme-only.")
  .action(setupCommand);
program.command("doctor").description("Check local workspace health.").action(doctorCommand);
program
  .command("auth")
  .description("Configure or refresh Admin API authentication.")
  .option("--data-agent", "Configure Admin API access for Shopify data-agent features.")
  .option("--advanced", "Choose a non-default auth mode instead of the permanent OAuth flow.")
  .action(authCommand);
program.command("configure").description("Regenerate local agent and MCP configuration.").action(configureCommand);
program.addCommand(themeCommand());
program.addCommand(dataCommand());

program.parseAsync(process.argv).catch((error: unknown) => {
  logger.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
