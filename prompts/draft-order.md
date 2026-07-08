# Draft Order

Goal: create, inspect, update, invoice, or complete a draft order.

Required data-agent scope: `read_draft_orders`, `write_draft_orders`, `read_products`, `read_customers`.

Steps:

1. Resolve the customer by email, name, or phone when a customer is involved.
2. Resolve products and variants by title, handle, or SKU before asking for IDs.
3. Show the proposed draft order: customer, line items, quantities, discounts, shipping, taxes, note, tags, and invoice behavior.
4. Ask for explicit confirmation before creating, invoicing, completing, or deleting a draft order.
5. After applying, read the draft order back and summarize the draft order name, status, total, and next action.

Safety rules:

- Never send an invoice email without explicit confirmation.
- Never complete a draft order unless payment and fulfillment implications are clear.
- If product prices are overridden, list every override before applying it.
