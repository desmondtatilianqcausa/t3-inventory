import { api, internal } from "./_generated/api";
import { internalMutation, internalQuery } from "./_generated/server";

import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

export const seedAndKickoff = internalMutation({
  args: {
    monday: v.optional(
      v.object({
        apiToken: v.string(),
        boardId: v.number(),
        groupId: v.optional(v.string()),
      }),
    ),
    lineItems: v.optional(
      v.array(
        v.object({ name: v.string(), price: v.number(), quantity: v.number() }),
      ),
    ),
  },
  returns: v.object({ orderId: v.id("orders"), runId: v.id("workflow_runs") }),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Ensure Monday integration/connection exists
    const integ = await ctx.db
      .query("integrations")
      .withIndex("by_kind", (q) => q.eq("kind", "monday"))
      .first();
    if (!integ) {
      if (!args.monday)
        throw new Error("Provide monday config to seed integration");
      const integId = await ctx.db.insert("integrations", {
        kind: "monday",
        name: "Monday Default",
        createdAt: now,
      });
      await ctx.db.insert("integrationConnections", {
        integrationId: integId,
        name: "Default",
        config: {
          apiToken: args.monday.apiToken,
          boardId: args.monday.boardId,
          ...(args.monday.groupId ? { groupId: args.monday.groupId } : {}),
          isDefault: true,
        },
        createdAt: now,
      });
    }

    // Ensure workflow exists and is published
    const wf = await ctx.db
      .query("workflows")
      .withIndex("by_name", (q) => q.eq("name", "order_to_monday"))
      .first();
    if (!wf) {
      const draft = {
        nodes: [
          { id: "t1", type: "trigger.orderCreated" },
          { id: "a1", type: "action.monday.upsertItem" },
          { id: "m1", type: "map.lineItems" },
          { id: "a2", type: "action.monday.upsertSubitem" },
          { id: "end", type: "end" },
        ],
        edges: [
          { from: "t1", to: "a1" },
          { from: "a1", to: "m1" },
          { from: "m1", to: "a2" },
          { from: "a2", to: "end" },
        ],
      } as const;

      const wfId = await ctx.db.insert("workflows", {
        name: "order_to_monday",
        status: "published",
        createdAt: now,
        updatedAt: now,
        draftGraphJson: draft,
      });
      await ctx.db.insert("workflow_versions", {
        workflowId: wfId,
        version: 1,
        state: "published",
        graphJson: draft,
        createdAt: now,
      });
    }

    // Ensure at least one product
    let product = await ctx.db.query("products").first();
    if (!product) {
      const pid = await ctx.db.insert("products", {
        name: "Test Product",
        description: "Seeded",
        quantity: 100,
        price: 9.99,
        category: "seed",
        productCategoryId: null,
        createdAt: now,
      });
      product = await ctx.db.get(pid);
    }

    // Create order
    const orderId = await ctx.db.insert("orders", {
      createdById: "e2e",
      createdAt: now,
      status: "Draft",
    });

    // Create line items
    const items =
      args.lineItems && args.lineItems.length > 0
        ? args.lineItems
        : [
            {
              name: String(product?.name ?? "Test Product"),
              price: Number(product?.price ?? 9.99),
              quantity: 2,
            },
          ];

    for (const i of items) {
      const prodId: Id<"products"> = product?._id as Id<"products">;
      await ctx.db.insert("orderLineItems", {
        orderId,
        productId: prodId,
        productName: i.name,
        unitPrice: i.price,
        quantity: i.quantity,
        createdAt: now,
      });
    }

    // Kickoff workflow run
    const runId: Id<"workflow_runs"> = await ctx.runMutation(
      api.workflows.runs.kickoff,
      { workflowName: "order_to_monday", context: { orderId } },
    );

    return { orderId, runId } as {
      orderId: Id<"orders">;
      runId: Id<"workflow_runs">;
    };
  },
});

export const verifyOrderMondayIds = internalQuery({
  args: { orderId: v.id("orders") },
  returns: v.object({
    hasItemId: v.boolean(),
    subitems: v.number(),
    withIds: v.number(),
  }),
  handler: async (ctx, { orderId }) => {
    const order = await ctx.db.get(orderId);
    const items = await ctx.db
      .query("orderLineItems")
      .withIndex("by_order", (q) => q.eq("orderId", orderId))
      .collect();
    const withIds = items.filter(
      (i) =>
        typeof i.mondaySubitemId === "string" && i.mondaySubitemId.length > 0,
    ).length;
    return {
      hasItemId:
        typeof order?.mondayItemId === "string" &&
        order.mondayItemId.length > 0,
      subitems: items.length,
      withIds,
    };
  },
});

export const checkIdempotency = internalMutation({
  args: { orderId: v.id("orders") },
  returns: v.object({
    unchanged: v.boolean(),
    mondayItemId: v.optional(v.string()),
  }),
  handler: async (ctx, { orderId }) => {
    const before = await ctx.db.get(orderId);
    await ctx.runMutation(api.workflows.runs.kickoff, {
      workflowName: "order_to_monday",
      context: { orderId },
    });
    const after = await ctx.db.get(orderId);
    const unchanged =
      (before?.mondayItemId ?? null) === (after?.mondayItemId ?? null);
    return { unchanged, mondayItemId: after?.mondayItemId };
  },
});

export const seedHappyPath = internalMutation({
  args: {
    monday: v.optional(
      v.object({
        apiToken: v.string(),
        boardId: v.number(),
        groupId: v.optional(v.string()),
      }),
    ),
  },
  returns: v.object({ orderId: v.id("orders"), runId: v.id("workflow_runs") }),
  handler: async (ctx, args) => {
    const res: { orderId: Id<"orders">; runId: Id<"workflow_runs"> } =
      await ctx.runMutation(internal.e2e.seedAndKickoff, {
        monday: args.monday,
      });
    return { orderId: res.orderId, runId: res.runId };
  },
});
