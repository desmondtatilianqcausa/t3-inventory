import { mutation, query } from "../_generated/server";

import { v } from "convex/values";

export const createIntegration = mutation({
  args: { name: v.string() },
  returns: v.id("integrations"),
  handler: async (ctx, { name }) => {
    const now = Date.now();
    return await ctx.db.insert("integrations", {
      kind: "monday",
      name: name.trim(),
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const createConnection = mutation({
  args: {
    integrationId: v.id("integrations"),
    name: v.string(),
    config: v.object({
      apiToken: v.string(),
      boardId: v.number(),
      groupId: v.optional(v.string()),
      isDefault: v.optional(v.boolean()),
    }),
  },
  returns: v.id("integrationConnections"),
  handler: async (ctx, { integrationId, name, config }) => {
    const now = Date.now();
    return await ctx.db.insert("integrationConnections", {
      integrationId,
      name: name.trim(),
      config,
      createdAt: now,
      updatedAt: now,
    });
  },
});
