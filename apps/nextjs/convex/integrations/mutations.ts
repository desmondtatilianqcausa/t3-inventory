import { v } from "convex/values";

import { mutation, query } from "../_generated/server";

const vJson = v.union(
  v.null(),
  v.boolean(),
  v.number(),
  v.string(),
  v.array(v.any()),
  v.object({}),
);

export const createIntegration = mutation({
  args: { name: v.string() },
  returns: v.id("integrations"),
  handler: async (ctx, { name }) => {
    return await ctx.db.insert("integrations", {
      kind: "monday",
      name,
      createdAt: Date.now(),
    });
  },
});

export const createConnection = mutation({
  args: {
    integrationId: v.id("integrations"),
    name: v.string(),
    config: v.optional(vJson),
  },
  returns: v.id("integrationConnections"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("integrationConnections", {
      integrationId: args.integrationId,
      name: args.name,
      config: args.config ?? {},
      createdAt: Date.now(),
    });
  },
});

export const updateConnection = mutation({
  args: {
    id: v.id("integrationConnections"),
    name: v.optional(v.string()),
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
  },
  returns: v.null(),
  handler: async (ctx, { id, ...rest }) => {
    await ctx.db.patch(id, { ...rest, updatedAt: Date.now() });
    return null;
  },
});

export const setConnectionColumnMap = mutation({
  args: {
    id: v.id("integrationConnections"),
    columnMap: v.record(v.string(), v.any()),
  },
  returns: v.null(),
  handler: async (ctx, { id, columnMap }) => {
    const conn = await ctx.db.get(id);
    const cfg = (conn?.config ?? {}) as Record<string, unknown>;
    await ctx.db.patch(id, {
      config: { ...cfg, columnMap },
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const listConnections = query({
  args: { integrationId: v.id("integrations") },
  handler: async (ctx, { integrationId }) => {
    return await ctx.db
      .query("integrationConnections")
      .withIndex("by_integration", (q) => q.eq("integrationId", integrationId))
      .collect();
  },
});
