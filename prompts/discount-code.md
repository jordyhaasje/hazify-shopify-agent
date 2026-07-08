# Discount Code

Goal: create, inspect, update, pause, or delete a Shopify discount code.

Required data-agent scope: `read_discounts`, `write_discounts`.

Steps:

1. Identify whether the merchant wants a percentage, fixed amount, free shipping, BXGY, or another discount type.
2. Resolve target products, collections, customer segments, countries, and dates by name before asking for IDs.
3. Show the proposed discount configuration: code, value, eligibility, usage limits, start and end dates, combinations, and status.
4. Ask for explicit confirmation before creating, changing, disabling, or deleting a discount.
5. After applying, read the discount back and summarize what is active.

Safety rules:

- Never create an unlimited high-value discount without confirmation that names the discount code and value.
- Never delete a discount without offering to disable it first.
- Use the store timezone for start and end times when available.
