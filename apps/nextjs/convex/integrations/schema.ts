import { defineTable } from "convex/server";
import { v } from "convex/values";

export const integrations = defineTable({
  kind: v.string(), // e.g., "monday", "wordpress", "webhook"
  name: v.string(),
  createdById: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
}).index("by_kind", ["kind"]);

export const integrationConnections = defineTable({
  integrationId: v.id("integrations"),
  name: v.string(),
  // Provider-specific configuration
  // For Monday.com we expect apiToken and board ids; extend per kind as needed
  config: v.optional(
    v.object({
      apiToken: v.optional(v.string()),
      boardId: v.optional(v.number()),
      groupId: v.optional(v.string()),
      isDefault: v.optional(v.boolean()),
      columnMap: v.optional(v.record(v.string(), v.any())),
      ordersBoardId: v.optional(v.number()),
      inventoryBoardId: v.optional(v.number()),
      eventsBoardId: v.optional(v.number()),
      enableOrdersSync: v.optional(v.boolean()),
      enableInventorySync: v.optional(v.boolean()),
      enableEventsSync: v.optional(v.boolean()),
    }),
  ),
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
}).index("by_integration", ["integrationId"]);
