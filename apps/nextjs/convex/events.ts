import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

import { v } from "convex/values";

export const list = query({
  args: { categoryId: v.optional(v.id("categories")) },
  handler: async (ctx, args): Promise<Doc<"events">[]> => {
    let rows = await ctx.db.query("events").order("desc").collect();
    if (args.categoryId) {
      const cid = args.categoryId as Id<"categories">;
      rows = rows.filter((e) => (e.categoryIds ?? []).some((id) => id === cid));
    }
    return rows;
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    lat: v.number(),
    lng: v.number(),
    color: v.optional(v.string()),
    startAt: v.optional(v.number()),
    endAt: v.optional(v.number()),
    featured: v.optional(v.boolean()),
    categoryIds: v.optional(v.array(v.id("categories"))),
  },
  handler: async (ctx, args) => {
    // Validate all categories are allowed for postType 'event'
    if (args.categoryIds && args.categoryIds.length > 0) {
      const cats = await Promise.all(
        args.categoryIds.map((id) => ctx.db.get(id)),
      );
      for (const c of cats) {
        if (!c) continue;
        if (!c.postTypes.includes("event")) {
          throw new Error(
            `Category ${c.slug} is not allowed for postType 'event'`,
          );
        }
      }
    }
    const id = await ctx.db.insert("events", args);
    return id;
  },
});
