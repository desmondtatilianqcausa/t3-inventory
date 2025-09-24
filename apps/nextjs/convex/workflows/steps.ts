import { query } from "../_generated/server";
import { v } from "convex/values";

export const listByRun = query({
  args: { runId: v.id("workflow_runs") },
  handler: async (ctx, { runId }) => {
    return await ctx.db
      .query("workflow_steps")
      .withIndex("by_run", (q) => q.eq("runId", runId))
      .order("asc")
      .collect();
  },
});

export const getById = query({
  args: { stepId: v.id("workflow_steps") },
  handler: async (ctx, { stepId }) => {
    return await ctx.db.get(stepId);
  },
});
