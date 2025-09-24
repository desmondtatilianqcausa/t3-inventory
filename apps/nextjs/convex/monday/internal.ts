import { api } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { v } from "convex/values";

export const runSync = internalAction({
  args: { orderId: v.id("orders") },
  returns: v.null(),
  handler: async (ctx, { orderId }) => {
    await ctx.runAction(api.monday.sync.syncOrderToMonday, { orderId });
    return null;
  },
});
