# Local OAuth Workflow

This is the default local data-agent route:

```bash
npm run data:connect
```

The local OAuth helper is conservative.

It:

- Provisions or links the Shopify app through Shopify CLI.
- Applies app scopes and redirect URLs with non-interactive Shopify CLI flags where supported.
- Pulls app credentials from Shopify CLI env output.
- Starts a callback server on `127.0.0.1:3456`.
- Uses redirect URL `http://127.0.0.1:3456/callback`.
- Generates a random OAuth state.
- Opens the Shopify install URL in the browser.
- Validates returned state.
- Validates Shopify HMAC when callback parameters are present.
- Exchanges the OAuth code for a permanent offline access token.
- Stores the token securely.
- Regenerates MCP configs with the local `shopify-admin-api` server.

Shopify requires the merchant to approve installation once in the browser; a coding agent can open the flow and wait, but cannot approve it headlessly. If app provisioning is blocked by account permissions, use `npm run data:legacy-store-auth` as a temporary fallback.
