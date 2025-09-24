import { convexAuth } from "@convex-dev/auth/server";
import { query } from "./_generated/server";
import { v } from "convex/values";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
    providers: [],
  });

export const hasRole = query({
  args: { role: v.string() },
  handler: async (ctx, { role }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();
    if (!user) return false;
    const roles = (user.roles as string[] | undefined) ?? [];
    return roles.includes(role);
  },
}); 