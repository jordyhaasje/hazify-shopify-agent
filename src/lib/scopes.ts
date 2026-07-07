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
  metaobjects: [
    "read_metaobjects",
    "write_metaobjects",
    "read_metaobject_definitions",
    "write_metaobject_definitions"
  ],
  optional: ["read_all_orders"]
} as const;

export const CAPABILITY_SCOPES = {
  "Read-only store assistant": [
    "read_products",
    "read_orders",
    "read_customers",
    "read_inventory",
    "read_locations",
    "read_content",
    "read_files",
    "read_themes",
    "read_metaobjects",
    "read_metaobject_definitions"
  ],
  "Catalog manager": [
    "read_products",
    "write_products",
    "read_inventory",
    "write_inventory",
    "read_locations",
    "read_files",
    "write_files",
    "read_metaobjects",
    "write_metaobjects",
    "read_metaobject_definitions",
    "write_metaobject_definitions"
  ],
  "Content/theme manager": [
    "read_content",
    "write_content",
    "read_files",
    "write_files",
    "read_themes",
    "write_themes",
    "read_online_store_pages",
    "read_online_store_navigation",
    "write_online_store_navigation"
  ],
  "Order support": ["read_orders", "read_customers"],
  "Order management": ["read_orders", "write_orders", "read_customers", "read_fulfillments", "write_fulfillments"],
  Products: ["read_products", "write_products"],
  Customers: ["read_customers", "write_customers"],
  Orders: ["read_orders"],
  Inventory: ["read_inventory", "write_inventory", "read_locations"],
  Content: SCOPE_GROUPS.content,
  Themes: SCOPE_GROUPS.themes,
  "Metaobjects": SCOPE_GROUPS.metaobjects,
  "All orders older than standard access window": SCOPE_GROUPS.optional
} as const;

export type CapabilityName = keyof typeof CAPABILITY_SCOPES;

export function uniqueScopes(capabilities: CapabilityName[]): string[] {
  return [...new Set(capabilities.flatMap((capability) => [...CAPABILITY_SCOPES[capability]]))];
}

export const DEFAULT_CAPABILITIES: CapabilityName[] = [
  "Read-only store assistant"
];
