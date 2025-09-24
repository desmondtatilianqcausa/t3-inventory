import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const append = mutation({
  args: {
    ts: v.number(),
    level: v.string(),
    message: v.string(),
    meta: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("logs", args);
  },
});
