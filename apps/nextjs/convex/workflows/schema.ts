import { defineTable } from "convex/server";
import { v } from "convex/values";

export const workflows = defineTable({
  name: v.string(),
  status: v.union(v.literal("draft"), v.literal("published")),
  draftGraphJson: v.optional(v.any()),
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
}).index("by_name", ["name"]);

export const workflow_versions = defineTable({
  workflowId: v.id("workflows"),
  version: v.number(),
  state: v.literal("published"),
  graphJson: v.any(),
  createdAt: v.number(),
}).index("by_workflow_and_version", ["workflowId", "version"]);

export const workflow_runs = defineTable({
  workflowId: v.id("workflows"),
  version: v.number(),
  status: v.string(), // inProgress | success | error | canceled
  startedAt: v.number(),
  finishedAt: v.optional(v.number()),
  error: v.optional(v.string()),
  context: v.optional(v.any()),
  outputs: v.optional(v.any()),
  createdAt: v.number(),
})
  .index("by_workflow", ["workflowId"])
  .index("by_status", ["status"]);

export const workflow_steps = defineTable({
  runId: v.id("workflow_runs"),
  nodeId: v.string(),
  type: v.string(),
  status: v.string(),
  retryCount: v.optional(v.number()),
  startedAt: v.number(),
  finishedAt: v.optional(v.number()),
  logs: v.optional(v.any()),
}).index("by_run", ["runId"]);
