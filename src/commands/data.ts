import { Command } from "commander";
import { readLocalConfig } from "../lib/filesystem.js";
import { logger } from "../lib/logger.js";
import { askStoreDomain } from "../lib/prompts.js";
import { authenticateStoreData, storeDataVerifyCommand, verifyStoreData } from "../lib/storeData.js";
import { askCapabilityScopes } from "../lib/prompts.js";
import { upsertLocalConfig } from "../lib/filesystem.js";

async function getStoreDomain(): Promise<string> {
  const config = await readLocalConfig();
  return config?.storeDomain || askStoreDomain();
}

export function dataCommand(): Command {
  const command = new Command("data").description("Configure and verify Shopify data-agent access.");

  command
    .command("connect")
    .description("Authenticate Shopify CLI store access for data-agent operations.")
    .action(async () => {
      const storeDomain = await getStoreDomain();
      const scopes = await askCapabilityScopes();
      const exitCode = await authenticateStoreData(storeDomain, scopes);
      if (exitCode !== 0) {
        process.exitCode = exitCode;
        return;
      }
      await upsertLocalConfig({ storeDomain, authMode: "shopify-store-auth", scopes });
      const verified = await verifyStoreData(storeDomain);
      if (verified.ok) logger.success("Shopify data-agent access verified.");
      else logger.warn(`Auth finished, but verification failed. Retry: ${storeDataVerifyCommand(storeDomain)}`);
    });

  command
    .command("verify")
    .description("Verify Shopify CLI store auth with a read-only Admin GraphQL query.")
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
