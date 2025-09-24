import { query } from "../_generated/server";
import { v } from "convex/values";

export const getAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("integrations").collect();
  },
});

export const getByKind = query({
  args: { kind: v.string() },
  handler: async (ctx, { kind }) => {
    return await ctx.db
      .query("integrations")
      .withIndex("by_kind", (q) => q.eq("kind", kind))
      .first();
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

export const getConnectionById = query({
  args: { id: v.id("integrationConnections") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const listAllConnections = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("integrationConnections").order("desc").collect();
  },
});
