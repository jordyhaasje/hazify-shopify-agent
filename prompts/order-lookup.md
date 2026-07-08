# Order Lookup

Goal: answer questions about one or more orders, such as orders from today, a named order, or orders for a customer.

Required data-agent scope: `read_orders`; add `read_customers` when resolving by customer, and `read_all_orders` only when the requested order is outside Shopify's normal order access window.

Steps:

1. Verify Shopify data-agent access with `npm run data:verify` if the Admin API MCP server is not available.
2. Resolve the order by order name, customer email, customer name, date, or status before asking for an ID.
3. If the request is date-based, use the store timezone when available and state the date range used.
4. If multiple orders match, list the order name, date, customer, total, fulfillment status, and financial status.
5. Keep the answer focused on the merchant's question.

Safety rules:

- Do not modify orders from this prompt.
- Do not reveal sensitive customer data unless it directly answers the merchant's request.
- If the lookup returns many results, summarize first and offer to narrow the list.
