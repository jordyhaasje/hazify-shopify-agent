# Custom App Authentication

Shopify CLI login is not the same thing as an Admin API token.

Shopify CLI login enables CLI workflows such as theme list, theme pull, theme dev, app config validation, and supported store command flows. Admin API store data access requires app authorization or an access token with the right scopes.

Supported modes:

- Shopify CLI app provisioning / local OAuth.
- Existing Admin API access token.
- Theme-only mode.

The setup wizard tries to help with CLI checks and app config scaffolding, but Shopify app creation and linking can depend on Partner account permissions and the installed Shopify CLI version. If automatic provisioning cannot be verified, follow the fallback shown by setup.

Never paste secrets into chat. Use:

```bash
npm run auth
```

Secrets are collected through hidden terminal prompts and stored in the OS credential store when available. If OS storage is unavailable, the repo uses an encrypted local file under `.hazify/`, which is gitignored.
