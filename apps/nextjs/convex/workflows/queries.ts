import { internalQuery, query } from "../_generated/server";

import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("workflows").order("desc").collect();
    return rows;
  },
});

export const getById = query({
  args: { id: v.id("workflows") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const getVersions = query({
  args: { workflowId: v.id("workflows") },
  handler: async (ctx, { workflowId }) => {
    const versions = await ctx.db
      .query("workflow_versions")
      .withIndex("by_workflow_and_version", (q) =>
        q.eq("workflowId", workflowId),
      )
      .order("desc")
      .collect();
    return versions;
  },
});

export const getLatestPublishedByName = query({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const wf = await ctx.db
      .query("workflows")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();
    if (!wf) return null;
    const latest = await ctx.db
      .query("workflow_versions")
      .withIndex("by_workflow_and_version", (q) => q.eq("workflowId", wf._id))
      .order("desc")
      .take(1);
    return latest[0] ?? null;
  },
});

export const getRun = internalQuery({
  args: { id: v.id("workflow_runs") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const getVersionByWorkflowAndVersion = internalQuery({
  args: { workflowId: v.id("workflows"), version: v.number() },
  handler: async (ctx, { workflowId, version }) => {
    const rows = await ctx.db
      .query("workflow_versions")
      .withIndex("by_workflow_and_version", (q) =>
        q.eq("workflowId", workflowId),
      )
      .order("desc")
      .collect();
    return rows.find((r) => r.version === version) ?? null;
  },
});
