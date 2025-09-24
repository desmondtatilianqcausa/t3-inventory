import { api, internal } from "../_generated/api";
import { internalMutation, mutation } from "../_generated/server";

import type { Id } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    workflowId: v.optional(v.id("workflows")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { workflowId, limit }) => {
    const take = limit ?? 50;
    if (workflowId) {
      return await ctx.db
        .query("workflow_runs")
        .withIndex("by_workflow", (q) => q.eq("workflowId", workflowId))
        .order("desc")
        .take(take);
    }
    return await ctx.db.query("workflow_runs").order("desc").take(take);
  },
});

export const getById = query({
  args: { runId: v.id("workflow_runs") },
  handler: async (ctx, { runId }) => {
    return await ctx.db.get(runId);
  },
});

export const createRun = internalMutation({
  args: {
    workflowId: v.id("workflows"),
    version: v.number(),
    context: v.optional(v.any()),
  },
  returns: v.id("workflow_runs"),
  handler: async (ctx, { workflowId, version, context }) => {
    return await ctx.db.insert("workflow_runs", {
      workflowId,
      version,
      status: "inProgress",
      startedAt: Date.now(),
      createdAt: Date.now(),
      context: context ?? {},
    });
  },
});

export const updateRun = internalMutation({
  args: {
    id: v.id("workflow_runs"),
    status: v.string(),
    error: v.optional(v.string()),
    outputs: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, { id, status, error, outputs }) => {
    await ctx.db.patch(id, {
      status,
      error,
      outputs,
      finishedAt: ["success", "error", "canceled"].includes(status)
        ? Date.now()
        : undefined,
    });
    return null;
  },
});

export const createStep = internalMutation({
  args: {
    runId: v.id("workflow_runs"),
    nodeId: v.string(),
    type: v.string(),
  },
  returns: v.id("workflow_steps"),
  handler: async (ctx, { runId, nodeId, type }) => {
    return await ctx.db.insert("workflow_steps", {
      runId,
      nodeId,
      type,
      status: "inProgress",
      retryCount: 0,
      startedAt: Date.now(),
    });
  },
});

export const finishStep = internalMutation({
  args: {
    id: v.id("workflow_steps"),
    status: v.string(),
    retryCount: v.optional(v.number()),
    logs: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, { id, status, retryCount, logs }) => {
    await ctx.db.patch(id, {
      status,
      retryCount,
      logs,
      finishedAt: Date.now(),
    });
    return null;
  },
});

export const kickoff = mutation({
  args: {
    workflowName: v.string(),
    context: v.object({ orderId: v.id("orders") }),
  },
  returns: v.id("workflow_runs"),
  handler: async (ctx, { workflowName, context }) => {
    const latest: { workflowId: Id<"workflows">; version: number } | null =
      await ctx.runQuery(api.workflows.queries.getLatestPublishedByName, {
        name: workflowName,
      });
    if (!latest) throw new Error("Workflow not found or no published version");

    const runId: Id<"workflow_runs"> = await ctx.runMutation(
      internal.workflows.runs.createRun,
      {
        workflowId: latest.workflowId,
        version: latest.version,
        context,
      },
    );
    // Schedule interpreter to execute this run
    await ctx.scheduler.runAfter(0, api.workflows.interpreter.execute, {
      runId,
    });
    return runId;
  },
});
