import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const upsertProfile = mutation({
  args: {
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    tel: v.optional(v.string()),
    roles: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        firstName: args.firstName,
        lastName: args.lastName,
        tel: args.tel,
        roles: args.roles,
      });
      return existing._id;
    }
    return await ctx.db.insert("users", {
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      tel: args.tel,
      roles: args.roles ?? [],
    });
  },
});
