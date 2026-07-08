# Store Data Workflow

Users should not need Shopify IDs for normal store operations.

Resolve resources naturally:

- Product: title, handle, or SKU.
- Customer: email, name, or phone.
- Order: order name, customer email, or customer name.
- Collection: title or handle.
- Page: title or handle.

If a lookup returns multiple matches, ask the user to choose. If a change is destructive or hard to reverse, propose it first and wait for confirmation.

Use the permanent OAuth flow as the default local data-agent route:

```bash
npm run data:connect
npm run data:verify
```

Under the hood, this opens a one-time Shopify Custom App approval in the browser, stores an offline Admin API token locally, regenerates MCP configs with `shopify-admin-api`, and verifies with a read-only Admin GraphQL query.

If a Custom App cannot be created, use the legacy temporary fallback:

```bash
npm run data:legacy-store-auth
```

Use Shopify AI Toolkit and Shopify Dev MCP to validate GraphQL before executing store operations. The local Admin API MCP server is for authenticated execution against the merchant's store; it is not a replacement for Shopify docs, schemas, or validation.
