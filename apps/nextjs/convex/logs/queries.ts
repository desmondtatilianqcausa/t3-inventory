import { query } from "../_generated/server";
import { v } from "convex/values";

async function getUserRoles(ctx: any): Promise<string[]> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.email) return [];
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q: any) => q.eq("email", identity.email))
    .first();
  const roles = (user?.roles as string[] | undefined) ?? [];
  return roles;
}

export const getRecent = query({
  args: {
    limit: v.optional(v.number()),
    level: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const roles = await getUserRoles(ctx);
    const isAdmin = roles.includes("admin");
    if (!isAdmin) throw new Error("Unauthorized");

    let q = ctx.db.query("logs").order("desc");
    if (args.level) q = q.filter((qq: any) => qq.eq(qq.field("level"), args.level!));
    return await q.take(args.limit ?? 100);
  },
});

export const getByOrderId = query({
  args: { orderId: v.string() },
  handler: async (ctx, { orderId }) => {
    const roles = await getUserRoles(ctx);
    const isAllowed = roles.includes("admin") || roles.includes("staff");
    if (!isAllowed) throw new Error("Unauthorized");

    const rows = await ctx.db.query("logs").order("desc").take(1000);
    return rows.filter((r: any) => r.meta?.orderId === orderId);
  },
}); 