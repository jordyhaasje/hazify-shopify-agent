# Store Data Workflow

Users should not need Shopify IDs for normal store operations.

Resolve resources naturally:

- Product: title, handle, or SKU.
- Customer: email, name, or phone.
- Order: order name, customer email, or customer name.
- Collection: title or handle.
- Page: title or handle.

If a lookup returns multiple matches, ask the user to choose. If a change is destructive or hard to reverse, propose it first and wait for confirmation.

Use Shopify CLI store auth and store execute as the default local data-agent route:

```bash
npm run data:connect
npm run data:verify
```

Under the hood, this uses:

```bash
shopify store auth --store <store>.myshopify.com --scopes <selected-scopes>
shopify store execute --store <store>.myshopify.com --query "query { shop { name myshopifyDomain } }" --json
```

Use Shopify AI Toolkit and Shopify Dev MCP to validate GraphQL before executing store operations. Do not build a parallel Admin API system in this repo.
