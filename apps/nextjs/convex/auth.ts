import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { v } from "convex/values";

import { DataModel } from "./_generated/dataModel";
import { action, query } from "./_generated/server";

// import { ResendOTPPasswordReset } from "./ResendOTPPasswordReset";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password<DataModel>({
      profile(params, ctx) {
        console.log("params", params);
        return {
          email: params.email as string,
          // add other fields as needed
        };
      },
    }),
    ConvexCredentials,
  ],
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
