# Local OAuth Workflow

The local OAuth helper is conservative.

It:

- Starts a callback server on `127.0.0.1`.
- Uses port `3456` or a random available fallback port.
- Generates a random OAuth state.
- Opens the Shopify install URL in the browser.
- Validates returned state.
- Validates Shopify HMAC when callback parameters are present.
- Exchanges the OAuth code for an access token.
- Stores the token securely.

You need a Shopify app client ID, client secret, redirect URL, and scopes. If those are not available, use existing token mode or complete app setup in Shopify first.
