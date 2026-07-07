# Advanced Custom App Authentication

This is an advanced fallback. The default data-agent route is Shopify CLI store auth:

```bash
npm run data:connect
```

Shopify CLI account login is not the same thing as data-agent access.

Shopify CLI login enables CLI workflows such as theme list, theme pull, theme dev, app config validation, and supported store command flows. Admin API store data access requires app authorization or an access token with the right scopes.

Advanced modes:

- Existing Admin API access token.
- Shopify CLI app provisioning / local OAuth.

Shopify CLI can initialize apps, link app config, and deploy scopes, but it does not automatically give this workspace a permanent Admin API token. App/OAuth flows require app credentials, redirect URLs, and merchant authorization.

Never paste secrets into chat. Use:

```bash
npm run auth:advanced
```

Secrets are collected through hidden terminal prompts and stored in the OS credential store when available. If OS storage is unavailable, the repo uses an encrypted local file under `.hazify/`, which is gitignored.
