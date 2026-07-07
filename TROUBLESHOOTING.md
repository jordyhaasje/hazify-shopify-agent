# Troubleshooting

## Shopify CLI Missing

Install or upgrade:

```bash
npm install -g @shopify/cli@latest
shopify version
```

Use `shopify commands` and `shopify help <command>` to inspect current command behavior.

## NPM Cannot Read package.json

You are not in the cloned repository folder. If you cloned into a parent folder named `Shopify Agent`, the repo is probably nested:

```bash
cd hazify-shopify-agent
```

Then retry:

```bash
npm run doctor
```

## Shopify auth login --store Fails

Shopify CLI v4 does not support `--store` on `shopify auth login`.

Use:

```bash
shopify auth login
```

Then run the store-specific command:

```bash
shopify theme list --store <your-store>.myshopify.com
```

## Store Access Fails

Run:

```bash
shopify theme list --store <your-store>.myshopify.com
```

The CLI may open a browser login flow. Make sure your Shopify account has permission to view and edit themes.

## Theme Pull Fails

Run:

```bash
npm run theme:list
npm run theme:pull -- --theme <theme-id>
```

If automatic parsing fails, enter the theme ID manually from Shopify CLI output. You can paste IDs with or without `#`; Hazify normalizes `#189445996858` to `189445996858`.

The first pull into an empty `./theme` folder can show a Shopify CLI warning that the folder does not look like a theme directory. Confirming is expected when you are pulling the remote theme for the first time.

## Admin API Credentials Missing

Run:

```bash
npm run auth
```

Choose existing token mode if app provisioning or OAuth is not ready. Paste the token only into the hidden terminal prompt.

## Keychain Storage Unavailable

Some systems cannot build or load the optional native keychain package. In that case the CLI uses an encrypted local file under `.hazify/`. Keep your passphrase safe. The file is gitignored, but anyone with the file and passphrase can decrypt it.

## MCP Server Not Loading

Restart your AI client after setup. Confirm the relevant config exists:

- Codex: `.codex/config.toml`
- Claude Code: `.mcp.json`
- OpenCode: `opencode.json`

You can test Shopify Dev MCP directly:

```bash
npx -y @shopify/dev-mcp@latest
```

If you add a Shopify CLI MCP package, verify it is installable with `npm view <package>` before adding it to MCP config. The sample package names found in some public listings were not published to npm when this repo was created.

## Theme Check Fails

Theme Check failures usually mean the local theme needs fixes or the theme was not pulled yet. Run:

```bash
npm run theme:pull
npm run theme:check
```
