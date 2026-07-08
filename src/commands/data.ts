import { Command } from "commander";
import { readLocalConfig } from "../lib/filesystem.js";
import { logger } from "../lib/logger.js";
import { askStoreDomain } from "../lib/prompts.js";
import { legacyAuthenticateStoreData, storeDataVerifyCommand, verifyStoreData } from "../lib/storeData.js";
import { askCapabilityScopes } from "../lib/prompts.js";
import { upsertLocalConfig } from "../lib/filesystem.js";
import { authCommand } from "./auth.js";

async function getStoreDomain(): Promise<string> {
  const config = await readLocalConfig();
  return config?.storeDomain || askStoreDomain();
}

export function dataCommand(): Command {
  const command = new Command("data").description("Configure and verify Shopify data-agent access.");

  command
    .command("connect")
    .description("Run the one-time Shopify OAuth install flow for permanent data-agent access.")
    .action(async () => {
      await authCommand({ dataAgent: true });
    });

  command
    .command("legacy-store-auth")
    .description("Fallback: authenticate temporary Shopify CLI store access for data-agent operations.")
    .action(async () => {
      const storeDomain = await getStoreDomain();
      const scopes = await askCapabilityScopes();
      logger.warn("This is a legacy fallback. Prefer npm run data:connect for permanent OAuth access.");
      const exitCode = await legacyAuthenticateStoreData(storeDomain, scopes);
      if (exitCode !== 0) {
        process.exitCode = exitCode;
        return;
      }
      await upsertLocalConfig({ storeDomain, authMode: "shopify-store-auth", scopes });
      logger.success("Legacy Shopify CLI store auth completed.");
    });

  command
    .command("verify")
    .description("Verify the stored offline Admin API token with a read-only Admin GraphQL query.")
    .action(async () => {
      const storeDomain = await getStoreDomain();
      const verified = await verifyStoreData(storeDomain);
      if (verified.ok) {
        logger.success("Shopify data-agent access verified.");
        if (verified.stdout) console.log(verified.stdout);
      } else {
        logger.warn("Shopify data-agent access is not verified.");
        logger.info(`Run: npm run data:connect`);
        logger.info(`Or retry: ${storeDataVerifyCommand(storeDomain)}`);
        if (verified.stderr) logger.muted(verified.stderr);
        process.exitCode = verified.exitCode ?? 1;
      }
    });

  return command;
}
