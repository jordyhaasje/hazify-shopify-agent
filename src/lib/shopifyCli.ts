import { commandExists, runCapture, runInteractive } from "./exec.js";

export async function isShopifyCliInstalled(): Promise<boolean> {
  return commandExists("shopify");
}

export async function getShopifyCliVersion(): Promise<string | null> {
  const result = await runCapture("shopify", ["version"]);
  return result.ok ? result.stdout.trim() || result.stderr.trim() : null;
}

export async function runShopify(args: string[]): Promise<{
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | undefined;
}> {
  return runCapture("shopify", args);
}

export async function runShopifyInteractive(args: string[]): Promise<number> {
  return runInteractive("shopify", args);
}

export async function canRunShopifyCommand(args: string[]): Promise<boolean> {
  const result = await runCapture("shopify", [...args, "--help"]);
  return result.ok;
}
