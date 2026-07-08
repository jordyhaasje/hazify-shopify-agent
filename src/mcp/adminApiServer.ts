#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";
import { readAdminApiToken } from "../lib/secureStore.js";

const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
const apiVersion = process.env.SHOPIFY_ADMIN_API_VERSION ?? "2026-07";

function requireEnv(name: string, value: string | undefined): string {
  if (!value) throw new Error(`${name} is required for the Shopify Admin API MCP server.`);
  return value;
}

async function getAccessToken(): Promise<string> {
  if (process.env.SHOPIFY_ADMIN_API_TOKEN) return process.env.SHOPIFY_ADMIN_API_TOKEN;
  const domain = requireEnv("SHOPIFY_STORE_DOMAIN", storeDomain);
  const token = await readAdminApiToken(domain, { prompt: false });
  if (!token) {
    throw new Error("SHOPIFY_ADMIN_API_TOKEN is not set and no readable stored Admin API token was found. Run npm run data:connect, or set HAZIFY_CREDENTIAL_PASSPHRASE when using encrypted fallback storage.");
  }
  return token;
}

function isMutation(query: string): boolean {
  return query
    .replace(/^\s*#[^\n]*(\n|$)/gm, "")
    .trim()
    .toLowerCase()
    .startsWith("mutation");
}

async function callAdminGraphql(query: string, variables: Record<string, unknown> | undefined): Promise<unknown> {
  const token = await getAccessToken();
  const response = await fetch(`https://${requireEnv("SHOPIFY_STORE_DOMAIN", storeDomain)}/admin/api/${apiVersion}/graphql.json`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-shopify-access-token": token
    },
    body: JSON.stringify({ query, variables: variables ?? {} })
  });
  const body = await response.json().catch(async () => ({ raw: await response.text() }));
  if (!response.ok) {
    throw new Error(`Shopify Admin API request failed: HTTP ${response.status} ${JSON.stringify(body)}`);
  }
  return body;
}

const server = new McpServer({
  name: "hazify-shopify-admin-api",
  version: "0.1.0"
});

server.registerTool(
  "shopify_admin_graphql",
  {
    description: "Run a Shopify Admin GraphQL operation against the configured store. Set allowMutations only after user approval.",
    inputSchema: {
      query: z.string().min(1).describe("Admin GraphQL query or mutation."),
      variables: z.record(z.string(), z.unknown()).optional().describe("GraphQL variables as a JSON object."),
      allowMutations: z.boolean().optional().describe("Required for mutation operations.")
    }
  },
  async ({ query, variables, allowMutations }) => {
    if (isMutation(query) && !allowMutations) {
      throw new Error("Mutation blocked. Re-run with allowMutations=true after explicit user approval.");
    }
    const result = await callAdminGraphql(query, variables);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }
);

async function main(): Promise<void> {
  requireEnv("SHOPIFY_STORE_DOMAIN", storeDomain);
  await getAccessToken();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Hazify Shopify Admin API MCP server running on stdio.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
