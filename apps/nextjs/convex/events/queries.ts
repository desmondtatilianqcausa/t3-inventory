import { eventDoc } from "./schema";
import { query } from "../_generated/server";
import { v } from "convex/values";

export const getById = query({
  args: { id: v.id("events") },
  returns: v.union(eventDoc, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  returns: v.union(eventDoc, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

export const getAll = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(eventDoc),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    return await ctx.db.query("events").order("desc").take(limit);
  },
});

export const listUpcoming = query({
  args: { now: v.optional(v.number()), limit: v.optional(v.number()) },
  returns: v.array(eventDoc),
  handler: async (ctx, args) => {
    const now = args.now ?? Date.now();
    const limit = args.limit ?? 100;
    const rows = await ctx.db
      .query("events")
      .withIndex("by_startAt", (q) => q.gte("startAt", now))
      .order("asc")
      .take(limit);
    return rows;
  },
});

export const listByCreator = query({
  args: { createdById: v.string(), limit: v.optional(v.number()) },
  returns: v.array(eventDoc),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    return await ctx.db
      .query("events")
      .withIndex("by_creator", (q) => q.eq("createdById", args.createdById))
      .order("desc")
      .take(limit);
  },
});
