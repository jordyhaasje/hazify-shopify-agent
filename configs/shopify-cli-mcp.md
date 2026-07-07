# Shopify CLI MCP

The setup objective referenced `@AaronStackBarnes/shopify-cli-mcp`, but npm rejects uppercase package scopes and the package is not published under the lowercase package name from the public GitHub repository. A second public listing, `@gbrlxvii/shopify-cli-mcp`, is also not published to npm.

To avoid generating broken MCP configs, Hazify configures Shopify Dev MCP by default and uses direct Shopify CLI wrappers for theme commands.

If your team has a verified Shopify CLI MCP package, generate configs with:

```bash
HAZIFY_SHOPIFY_CLI_MCP_PACKAGE="@your-scope/shopify-cli-mcp" npm run setup
```

or:

```bash
HAZIFY_SHOPIFY_CLI_MCP_PACKAGE="@your-scope/shopify-cli-mcp" npm run configure
```
