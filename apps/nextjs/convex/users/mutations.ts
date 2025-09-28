import { v } from "convex/values";

import { mutation } from "../_generated/server";

export const upsertProfile = mutation({
  args: {
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    tel: v.optional(v.string()),
    roles: v.optional(v.array(v.string())),
    mustResetPassword: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (existing) {
      const patch: Record<string, unknown> = {};
      if (args.firstName !== undefined) patch.firstName = args.firstName;
      if (args.lastName !== undefined) patch.lastName = args.lastName;
      if (args.tel !== undefined) patch.tel = args.tel;
      if (args.roles !== undefined) patch.roles = args.roles;
      if (args.mustResetPassword !== undefined)
        patch.mustResetPassword = args.mustResetPassword;
      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(existing._id, patch as any);
      }
      return existing._id;
    }
    return await ctx.db.insert("users", {
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      tel: args.tel,
      roles: args.roles ?? ["user"],
      mustResetPassword: args.mustResetPassword ?? false,
    });
  },
});

export const setRoles = mutation({
  args: { id: v.id("users"), roles: v.array(v.string()) },
  handler: async (ctx, { id, roles }) => {
    await ctx.db.patch(id, { roles });
    return null;
  },
});

export const clearMustResetPasswordByEmail = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (user) {
      await ctx.db.patch(user._id, { mustResetPassword: false });
    }
    return null;
  },
});

export const upsertLoginRedirect = mutation({
  args: { role: v.string(), path: v.string() },
  handler: async (ctx, { role, path }) => {
    const existing = await ctx.db
      .query("loginRedirects")
      .withIndex("by_role", (q) => q.eq("role", role))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { path });
      return existing._id;
    }
    return await ctx.db.insert("loginRedirects", { role, path });
  },
});
