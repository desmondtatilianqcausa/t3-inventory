/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import type { Doc, Id } from "../_generated/dataModel";

import { mutation } from "../_generated/server";
import { v } from "convex/values";

// Minimal types to validate workflow graphs
type WorkflowNode = { id: string; type: string; [k: string]: unknown };
type WorkflowEdge = { from: string; to: string; [k: string]: unknown };
interface WorkflowGraph {
  nodes: Array<WorkflowNode>;
  edges: Array<WorkflowEdge>;
}

export const create = mutation({
  args: { name: v.string() },
  returns: v.id("workflows"),
  handler: async (ctx, { name }) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("workflows")
      .withIndex("by_name", (q) => q.eq("name", name.trim()))
      .first();
    if (existing) {
      throw new Error("Workflow name must be unique");
    }
    return await ctx.db.insert("workflows", {
      name: name.trim(),
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateDraft = mutation({
  args: { id: v.id("workflows"), graphJson: v.any() },
  returns: v.null(),
  handler: async (ctx, { id, graphJson }) => {
    // Basic schema validation for graphJson
    const errors: Array<string> = [];
    if (!graphJson || typeof graphJson !== "object") {
      errors.push("graphJson must be an object");
    }
    const g = graphJson as Partial<WorkflowGraph>;
    const nodes = Array.isArray(g.nodes) ? g.nodes : undefined;
    const edges = Array.isArray(g.edges) ? g.edges : undefined;
    if (!nodes) errors.push("graphJson.nodes must be an array");
    if (!edges) errors.push("graphJson.edges must be an array");

    if (nodes) {
      for (const n of nodes) {
        if (!n || typeof n !== "object") {
          errors.push("Each node must be an object");
          continue;
        }
        if (
          typeof (n as WorkflowNode).id !== "string" ||
          !(n as WorkflowNode).id
        ) {
          errors.push("Each node requires a string id");
        }
        if (
          typeof (n as WorkflowNode).type !== "string" ||
          !(n as WorkflowNode).type
        ) {
          errors.push(
            `Node ${typeof (n as WorkflowNode).id === "string" ? (n as WorkflowNode).id : "<unknown>"} missing type`,
          );
        }
      }
      // Required node presence
      const nodeTypes = new Set(nodes.map((n) => (n as WorkflowNode).type));
      if (!nodeTypes.has("trigger.orderCreated")) {
        errors.push("Must include a trigger.orderCreated node");
      }
      if (!nodeTypes.has("end")) {
        errors.push("Must include an end node");
      }
    }

    if (edges) {
      const nodeIds = new Set((nodes ?? []).map((n) => (n as WorkflowNode).id));
      for (const e of edges) {
        if (!e || typeof e !== "object") {
          errors.push("Each edge must be an object");
          continue;
        }
        if (
          typeof (e as WorkflowEdge).from !== "string" ||
          typeof (e as WorkflowEdge).to !== "string"
        ) {
          errors.push("Each edge must have string from/to");
          continue;
        }
        if (
          !nodeIds.has((e as WorkflowEdge).from) ||
          !nodeIds.has((e as WorkflowEdge).to)
        ) {
          errors.push(
            `Edge references unknown node: ${(e as WorkflowEdge).from} -> ${(e as WorkflowEdge).to}`,
          );
        }
      }
    }

    if (errors.length) {
      throw new Error(`Invalid workflow graph: ${errors.join("; ")}`);
    }

    await ctx.db.patch(id, {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      draftGraphJson: graphJson,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const publish = mutation({
  args: { id: v.id("workflows") },
  returns: v.number(),
  handler: async (ctx, { id }) => {
    const wf: Doc<"workflows"> | null = await ctx.db.get(id);
    if (!wf) throw new Error("Workflow not found");
    const latest: Array<Doc<"workflow_versions">> = await ctx.db
      .query("workflow_versions")
      .withIndex("by_workflow_and_version", (q) => q.eq("workflowId", id))
      .order("desc")
      .take(1);
    const nextVersion = (latest[0]?.version ?? 0) + 1;
    if (wf.draftGraphJson == null) {
      throw new Error("No draft graph to publish");
    }
    await ctx.db.insert("workflow_versions", {
      workflowId: id,
      version: nextVersion,
      state: "published",
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      graphJson: wf.draftGraphJson,
      createdAt: Date.now(),
    });
    await ctx.db.patch(id, { status: "published", updatedAt: Date.now() });
    return nextVersion;
  },
});
