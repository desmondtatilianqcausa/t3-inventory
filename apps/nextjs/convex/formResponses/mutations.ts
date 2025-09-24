import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: { data: v.any(), createdById: v.string() },
  handler: async (ctx, { data, createdById }) => {
    return await ctx.db.insert("formResponses", {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data,
      createdAt: Date.now(),
      createdById,
      status: "checkout",
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("formResponses"),
    mondayItemId: v.optional(v.string()),
    data: v.optional(v.any()),
    status: v.optional(v.string()),
    processingStatus: v.optional(v.string()),
    processingMeta: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
    return id;
  },
}); 