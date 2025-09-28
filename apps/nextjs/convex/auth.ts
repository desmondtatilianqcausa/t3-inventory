import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { v } from "convex/values";

import { action, query } from "./_generated/server";

// import { ResendOTPPasswordReset } from "./ResendOTPPasswordReset";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password, ConvexCredentials],
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

// NOTE: For production, verify Monday session token server-side. Here we accept email from client Monday SDK and upsert.
export const mondaySignIn = action({
  args: { email: v.string() },
  returns: v.object({ code: v.string() }),
  handler: async (ctx, { email }) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!existing) {
      await ctx.db.insert("users", { email, roles: ["user"] });
    }
    // Issue a one-time code using ConvexCredentials provider
    const code = await auth.issueOneTimeCode({ email });
    return { code };
  },
});
