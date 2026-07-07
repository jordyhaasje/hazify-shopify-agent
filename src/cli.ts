#!/usr/bin/env node
import { Command } from "commander";
import { setupCommand } from "./commands/setup.js";
import { doctorCommand } from "./commands/doctor.js";
import { authCommand } from "./commands/auth.js";
import { configureCommand } from "./commands/configure.js";
import { themeCommand } from "./commands/theme.js";
import { logger } from "./lib/logger.js";

const program = new Command();

program
  .name("hazify-shopify-agent")
  .description("Local Shopify AI agent workspace setup and operations CLI.")
  .version("0.1.0");

program.command("setup").description("Run the interactive setup wizard.").action(setupCommand);
program.command("doctor").description("Check local workspace health.").action(doctorCommand);
program.command("auth").description("Configure or refresh Admin API authentication.").action(authCommand);
program.command("configure").description("Regenerate local agent and MCP configuration.").action(configureCommand);
program.addCommand(themeCommand());

program.parseAsync(process.argv).catch((error: unknown) => {
  logger.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
