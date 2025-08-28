import { mutation, query } from "./_generated/server";

import { v } from "convex/values";

export const list = query({
  args: { postType: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("categories").order("asc").collect();
    if (!args.postType) return rows;
    const pt = args.postType;
    return rows.filter((c) => (pt ? c.postTypes.includes(pt) : true));
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    postTypes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert("categories", args);
  },
});
