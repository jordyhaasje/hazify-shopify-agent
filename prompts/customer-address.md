# Customer Address Change

Goal: update a customer's saved address or an order shipping address when Shopify allows it.

Required data-agent scope: `read_customers`, `write_customers`; add `read_orders` and the current validated order-edit scope only when changing an order delivery address.

Steps:

1. Resolve the customer by email, name, or phone before asking for an ID.
2. If the merchant refers to an order, resolve the order by order name or customer details.
3. Show the current address and the proposed new address in a clear before/after summary.
4. Validate required fields: recipient name, address lines, city, region, postal code, country, and phone when required.
5. Ask for explicit confirmation before applying the change.
6. Re-read the customer or order and summarize the updated address.

Safety rules:

- Never update multiple customers or orders without listing each target first.
- Do not change billing addresses unless the merchant explicitly asks.
- If an order is already fulfilled, explain that carrier-facing changes may require a manual shipping-carrier action outside Shopify.
