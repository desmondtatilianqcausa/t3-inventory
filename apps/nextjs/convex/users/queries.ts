import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

import { query } from "../_generated/server";

export const getById = query({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const row = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    return row ?? null;
  },
});

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    console.log("userId", userId);
    return userId !== null ? ctx.db.get(userId) : null;
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    console.log("identity", identity);
    if (!identity?.email) return null;
    const row = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();
    return row ?? null;
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("users").collect();
    return rows;
  },
});

export const listLoginRedirects = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("loginRedirects").collect();
  },
});

export const getLoginRedirectForRole = query({
  args: { role: v.string() },
  handler: async (ctx, { role }) => {
    return await ctx.db
      .query("loginRedirects")
      .withIndex("by_role", (q) => q.eq("role", role))
      .first();
  },
});
