# Order Refund

Goal: prepare and process a refund for the order the merchant names.

Required data-agent scope: `read_orders`, `write_orders`; use Shopify Dev MCP to validate the exact refund mutation and any additional scope requirements for the current Admin API version.

Steps:

1. Resolve the order by order name, customer email, or customer name before asking for an ID.
2. Read refundable line items, transactions, fulfillment state, current financial status, and previous refunds.
3. Ask which items, quantities, shipping amount, duties, or custom amount should be refunded if the merchant has not specified them.
4. Show a refund summary before executing: order name, customer, items, quantities, amount, reason, restock behavior, and whether the customer will be notified.
5. Execute the refund only after explicit confirmation.
6. Read the order again and summarize the final refund result.

Safety rules:

- Never refund more than one order without listing each proposed refund first.
- Never infer a full refund when the merchant's wording is ambiguous.
- Do not restock items unless the merchant confirms that behavior or the store policy is clear.
- Stop if the order has disputes, chargebacks, prior unusual refunds, or unsupported payment transactions.
