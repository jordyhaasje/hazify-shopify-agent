export const SCOPE_GROUPS = {
  baseStoreData: [
    "read_products",
    "write_products",
    "read_customers",
    "write_customers",
    "read_orders",
    "read_inventory",
    "write_inventory",
    "read_locations"
  ],
  content: ["read_content", "write_content", "read_files", "write_files"],
  themes: ["read_themes", "write_themes"],
  metafields: ["read_metafields", "write_metafields", "read_metaobjects", "write_metaobjects"],
  optional: ["read_all_orders"]
} as const;

export const CAPABILITY_SCOPES = {
  Products: ["read_products", "write_products"],
  Customers: ["read_customers", "write_customers"],
  Orders: ["read_orders"],
  Inventory: ["read_inventory", "write_inventory", "read_locations"],
  Content: SCOPE_GROUPS.content,
  Themes: SCOPE_GROUPS.themes,
  "Metafields/metaobjects": SCOPE_GROUPS.metafields,
  "All orders older than standard access window": SCOPE_GROUPS.optional
} as const;

export type CapabilityName = keyof typeof CAPABILITY_SCOPES;

export function uniqueScopes(capabilities: CapabilityName[]): string[] {
  return [...new Set(capabilities.flatMap((capability) => [...CAPABILITY_SCOPES[capability]]))];
}

export const DEFAULT_CAPABILITIES: CapabilityName[] = [
  "Products",
  "Customers",
  "Orders",
  "Inventory",
  "Content",
  "Themes",
  "Metafields/metaobjects"
];
