# Inventory Adjustment

Goal: check or change inventory for a product variant at a store location.

Required data-agent scope: `read_products`, `read_inventory`, `write_inventory`, `read_locations`.

Steps:

1. Resolve the product by title, handle, or SKU before asking for an ID.
2. Resolve the variant and location by merchant-friendly names.
3. Read current inventory levels for the matching inventory item and location.
4. If changing inventory, show current quantity, proposed quantity or delta, location, SKU, and reason.
5. Ask for explicit confirmation before applying an adjustment.
6. Re-read inventory after the change and summarize the final quantity.

Safety rules:

- Never change inventory at more than one location without listing each location and change first.
- Do not guess between variants with similar titles or SKUs.
- Preserve the difference between setting an absolute quantity and applying an adjustment delta.
