# Store Data Workflow

Users should not need Shopify IDs for normal store operations.

Resolve resources naturally:

- Product: title, handle, or SKU.
- Customer: email, name, or phone.
- Order: order name, customer email, or customer name.
- Collection: title or handle.
- Page: title or handle.

If a lookup returns multiple matches, ask the user to choose. If a change is destructive or hard to reverse, propose it first and wait for confirmation.

Use Shopify AI Toolkit, Shopify Dev MCP, Shopify CLI store execution, or configured Admin API access. Do not build a parallel Admin API system in this repo.
