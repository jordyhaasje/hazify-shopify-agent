import { runInteractive } from "./exec.js";

export async function installShopifyCliGlobal(): Promise<number> {
  return runInteractive("npm", ["install", "-g", "@shopify/cli@latest"]);
}
