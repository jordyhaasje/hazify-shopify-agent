import crypto from "node:crypto";
import http from "node:http";
import open from "open";
import { logger } from "./logger.js";

export interface OAuthOptions {
  storeDomain: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
}

export interface OAuthTokenResponse {
  accessToken: string;
  scope: string;
}

export const OAUTH_CALLBACK_PORT = 3456;
export const OAUTH_CALLBACK_URL = `http://127.0.0.1:${OAUTH_CALLBACK_PORT}/callback`;

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function validateShopifyHmac(params: URLSearchParams, clientSecret: string): boolean {
  const hmac = params.get("hmac");
  if (!hmac) return false;
  const pairs = [...params.entries()]
    .filter(([key]) => key !== "hmac" && key !== "signature")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const digest = crypto.createHmac("sha256", clientSecret).update(pairs).digest("hex");
  return safeEqual(digest, hmac);
}

export async function runLocalOAuth(options: OAuthOptions): Promise<OAuthTokenResponse> {
  const state = crypto.randomBytes(24).toString("hex");
  const server = http.createServer();
  const callbackPromise = new Promise<{ code: string; params: URLSearchParams }>((resolve, reject) => {
    server.on("request", (request, response) => {
      const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
      if (url.pathname !== "/callback") {
        response.writeHead(404);
        response.end("Not found");
        return;
      }
      if (url.searchParams.get("state") !== state) {
        response.writeHead(400);
        response.end("Invalid OAuth state.");
        reject(new Error("Invalid OAuth state."));
        return;
      }
      if (!validateShopifyHmac(url.searchParams, options.clientSecret)) {
        response.writeHead(400);
        response.end("Invalid Shopify OAuth HMAC.");
        reject(new Error("Invalid Shopify OAuth HMAC."));
        return;
      }
      const code = url.searchParams.get("code");
      if (!code) {
        response.writeHead(400);
        response.end("Missing OAuth code.");
        reject(new Error("Missing OAuth code."));
        return;
      }
      response.writeHead(200, { "content-type": "text/plain" });
      response.end("Shopify authorization complete. You can close this tab.");
      resolve({ code, params: url.searchParams });
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        reject(new Error(`OAuth callback port ${OAUTH_CALLBACK_PORT} is already in use. Stop the other process and rerun npm run data:connect.`));
        return;
      }
      reject(error);
    });
    server.listen(OAUTH_CALLBACK_PORT, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Could not determine OAuth callback port.");
  }

  const installUrl = new URL(`https://${options.storeDomain}/admin/oauth/authorize`);
  installUrl.searchParams.set("client_id", options.clientId);
  installUrl.searchParams.set("scope", options.scopes.join(","));
  installUrl.searchParams.set("redirect_uri", OAUTH_CALLBACK_URL);
  installUrl.searchParams.set("state", state);
  // Omit grant_options[]=per-user so Shopify returns an offline token for the store.

  // This browser step is intentionally not headless: Shopify requires the merchant
  // to approve app installation once. The stored offline token is reused after that.
  const installUrlText = installUrl.toString();
  logger.step("Shopify browser approval");
  logger.info("Opening Shopify so the merchant can approve the local store assistant once.");
  logger.info("If the browser does not open, copy this URL into the browser:");
  logger.info(installUrlText);
  try {
    await open(installUrlText);
  } catch {
    logger.warn("The browser did not open automatically. Use the URL above, then return here after approval.");
  }
  try {
    const callback = await callbackPromise;
    const tokenResponse = await fetch(`https://${options.storeDomain}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_id: options.clientId,
        client_secret: options.clientSecret,
        code: callback.code
      })
    });

    if (!tokenResponse.ok) {
      throw new Error(`Shopify OAuth token exchange failed: HTTP ${tokenResponse.status}`);
    }

    const body = (await tokenResponse.json()) as { access_token?: string; scope?: string };
    if (!body.access_token) throw new Error("Shopify OAuth token response did not include an access token.");
    return { accessToken: body.access_token, scope: body.scope ?? "" };
  } finally {
    server.close();
  }
}
