import type { FunctionReference } from "convex/server";
import { v } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import { api } from "../_generated/api";
import { action, mutation } from "../_generated/server";
import { callMondayApi } from "./helpers";

const orderStatus = v.union(
  v.literal("Draft"),
  v.literal("Awaiting Payment"),
  v.literal("Processing"),
  v.literal("Complete"),
  v.literal("Check-Out"),
  v.literal("Check-In"),
);

// export const checkoutSync = action({
//   args: { orderId: v.id("formResponses") },
//   handler: async (ctx, { orderId }) => {
//     const formResponse: Doc<"formResponses"> | null = await ctx.runQuery(api.formResponses.queries.getById, { id: orderId });
//     if (!formResponse) throw new Error("Order not found");
//
//     await ctx.runMutation(api.formResponses.mutations.update, {
//       id: orderId,
//       processingStatus: "processing",
//     });
//
//     try {
//       const data = formResponse.data as unknown as { items?: Array<{ productId: Id<"products">; quantity: number; name?: string }>; lineItems?: Array<{ productId: Id<"products">; quantity: number; name?: string }> };
//       const items: Array<{ productId: Id<"products">; quantity: number; name?: string }> =
//         data?.items ?? data?.lineItems ?? [];
//
//       let mondayItemId: string | undefined = formResponse.mondayItemId;
//       if (!mondayItemId) {
//         type CreateItem = { data: { create_item: { id: string } } };
//         const createItemQuery = `mutation ($boardId: Int!, $groupId: String!, $itemName: String!, $columnValues: JSON!) {
//           create_item (board_id: $boardId, group_id: $groupId, item_name: $itemName, column_values: $columnValues) { id }
//         }`;
//         const variables = {
//           boardId: parseInt(process.env.MONDAY_BOARD_ID!),
//           groupId: process.env.MONDAY_GROUP_ID!,
//           itemName: `Order ${String(orderId)}`,
//           columnValues: JSON.stringify({ status: { label: "Checked Out" } }),
//         };
//         const result = (await callMondayApi(createItemQuery, variables)) as CreateItem;
//         mondayItemId = result.data.create_item.id;
//         await ctx.runMutation(api.formResponses.mutations.update, { id: orderId, mondayItemId });
//       }
//
//       for (const item of items) {
//         const product: Doc<"products"> | null = await ctx.runQuery(api.products.queries.getById, { id: item.productId });
//         if (!product) continue;
//
//         const createSubitemQuery = `mutation ($parentItemId: Int!, $itemName: String!, $columnValues: JSON!) {
//           create_subitem (parent_item_id: $parentItemId, item_name: $itemName, $columnValues: $columnValues) { id }
//         }`;
//         const subVars = {
//           parentItemId: parseInt(mondayItemId!),
//           itemName: product.name as string,
//           columnValues: JSON.stringify({
//             quantity: item.quantity,
//             status: { label: "Checked Out" },
//           }),
//         };
//         await callMondayApi(createSubitemQuery, subVars);
//
//         await ctx.runMutation(api.products.mutations.updateQuantity, {
//           id: item.productId,
//           quantity: Math.max(0, product.quantity - item.quantity),
//         });
//       }
//
//       await ctx.runMutation(api.formResponses.mutations.update, {
//         id: orderId,
//         processingStatus: "completed",
//       });
//
//       await ctx.runMutation(api.logs.mutations.append, {
//         ts: Date.now(),
//         level: "info",
//         message: "checkoutSync completed",
//         meta: { orderId, mondayItemId },
//       });
//
//       return { success: true, mondayItemId };
//     } catch (err) {
//       const message = err instanceof Error ? err.message : String(err);
//       await ctx.runMutation(api.formResponses.mutations.update, {
//         id: orderId,
//         processingStatus: "failed",
//         processingMeta: { error: message },
//       });
//       await ctx.runMutation(api.logs.mutations.append, {
//         ts: Date.now(),
//         level: "error",
//         message: "checkoutSync failed",
//         meta: { orderId, error: message },
//       });
//       throw err;
//     }
//   },
// });

export const create = mutation({
  args: {
    createdById: v.string(),
    eventId: v.optional(v.id("events")),
    status: v.optional(orderStatus),
    processingStatus: v.optional(v.string()),
    totalQuantity: v.optional(v.number()),
    totalPrice: v.optional(v.number()),
    pickupDropoffLocation: v.optional(v.string()),
  },
  returns: v.id("orders"),
  handler: async (ctx, args) => {
    const now = Date.now();
    // Generate next order number (start at 274)
    const key = "orders";
    const existingCounter = await ctx.db
      .query("counters")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    let nextNumber = 274;
    if (!existingCounter) {
      await ctx.db.insert("counters", { key, value: nextNumber + 1 });
    } else {
      nextNumber = existingCounter.value;
      await ctx.db.patch(existingCounter._id, { value: nextNumber + 1 });
    }
    const id = await ctx.db.insert("orders", {
      ...args,
      orderNumber: nextNumber,
      createdAt: now,
      updatedAt: now,
    });
    // No Monday scheduling here; Draft should not sync
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("orders"),
    createdById: v.optional(v.string()),
    eventId: v.optional(v.id("events")),
    status: v.optional(orderStatus),
    processingStatus: v.optional(v.string()),
    totalQuantity: v.optional(v.number()),
    totalPrice: v.optional(v.number()),
    pickupDropoffLocation: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { id, ...rest }) => {
    const existing = await ctx.db.get(id);
    await ctx.db.patch(id, { ...rest, updatedAt: Date.now() });

    // Detect transitions and delegate to specialized mutations
    let triggeredTransition = false;
    if (rest.status === "Check-Out" && existing?.status !== "Check-Out") {
      await ctx.runMutation(api.orders.mutations.checkout, { id });
      triggeredTransition = true;
    } else if (rest.status === "Check-In" && existing?.status !== "Check-In") {
      await ctx.runMutation(api.orders.mutations.checkin, { id });
      triggeredTransition = true;
    }

    // If the order is currently in Check-Out or Check-In, schedule a Monday sync
    // only when we did NOT trigger a transition above (to avoid duplicate scheduling)
    try {
      const finalStatus = (rest.status ?? existing?.status) as
        | string
        | undefined;
      if (
        !triggeredTransition &&
        (finalStatus === "Check-Out" || finalStatus === "Check-In")
      ) {
        const integration = await ctx.runQuery(
          api.integrations.queries.getByKind,
          {
            kind: "monday",
          },
        );
        const connections = integration
          ? await ctx.runQuery(api.integrations.queries.listConnections, {
              integrationId: integration._id,
            })
          : [];
        const cfg = ((connections ?? [])[0]?.config ?? {}) as {
          enableOrdersSync?: boolean;
          columnMap?: Record<string, unknown>;
        };
        const ordersEnabled =
          (cfg.enableOrdersSync as boolean | undefined) ??
          (cfg.columnMap?.enableOrdersSync as boolean | undefined) ??
          true;
        if (ordersEnabled) {
          const ref =
            "monday/sync:syncOrderToMonday" as unknown as FunctionReference<"action">;
          await ctx.scheduler.runAfter(0, ref, { orderId: id });
        }
      }
    } catch {}

    return null;
  },
});

export const setLineItems = mutation({
  args: {
    orderId: v.id("orders"),
    items: v.array(
      v.object({
        productId: v.id("products"),
        quantity: v.number(),
        checkinQuantity: v.optional(v.number()),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, { orderId, items }) => {
    const now = Date.now();

    // Validate stock constraints before mutating
    for (const item of items) {
      const product = await ctx.db.get(item.productId);
      const currentStock =
        typeof product?.stock === "number" ? product.stock : 0;
      if (item.quantity > currentStock) {
        throw new Error(
          `Insufficient stock for product ${String(item.productId)}. Requested ${item.quantity}, available ${currentStock}.`,
        );
      }
      if (item.quantity < 0) {
        throw new Error("Quantity cannot be negative");
      }
    }

    // Remove existing line items for this order
    const existing = await ctx.db
      .query("orderLineItems")
      .withIndex("by_order", (q) => q.eq("orderId", orderId))
      .collect();
    for (const li of existing) {
      await ctx.db.delete(li._id);
    }

    // Insert new items and compute totals
    let totalQuantity = 0;
    let totalPrice = 0;

    for (const item of items) {
      const product = await ctx.db.get(item.productId);
      const unitPrice = product?.price ?? 0;
      const productName =
        typeof product?.name === "string" ? product.name : undefined;

      await ctx.db.insert("orderLineItems", {
        orderId,
        productId: item.productId,
        productName,
        unitPrice,
        quantity: item.quantity,
        checkinQuantity: item.checkinQuantity,
        createdAt: now,
      });

      totalQuantity += item.quantity;
      totalPrice += unitPrice * item.quantity;
    }

    await ctx.db.patch(orderId, {
      totalQuantity,
      totalPrice,
      updatedAt: now,
    });

    // Do not auto-schedule Monday sync here
    return null;
  },
});

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const setFeaturedImage = mutation({
  args: {
    orderId: v.id("orders"),
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, { orderId, storageId }) => {
    const url = await ctx.storage.getUrl(storageId);
    const patch: Record<string, unknown> = {
      featuredImageId: storageId,
    };
    if (typeof url === "string") patch.featuredImageUrl = url;
    await ctx.db.patch(orderId, patch);
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("orders") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    // Delete line items first
    const items = await ctx.db
      .query("orderLineItems")
      .withIndex("by_order", (q) => q.eq("orderId", id))
      .collect();
    for (const li of items) {
      await ctx.db.delete(li._id);
    }
    // Delete the order
    await ctx.db.delete(id);
    return null;
  },
});

export const setMondayItemId = mutation({
  args: { id: v.id("orders"), mondayItemId: v.string() },
  returns: v.null(),
  handler: async (ctx, { id, mondayItemId }) => {
    await ctx.db.patch(id, { mondayItemId });
    return null;
  },
});

export const setLineItemMondayId = mutation({
  args: { id: v.id("orderLineItems"), mondaySubitemId: v.string() },
  returns: v.null(),
  handler: async (ctx, { id, mondaySubitemId }) => {
    await ctx.db.patch(id, { mondaySubitemId, updatedAt: Date.now() });
    return null;
  },
});

// Checkout mutation: Convex-first updates then enqueue Monday sync
export const checkout = mutation({
  args: { id: v.id("orders") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    console.log("checkout mutation", id);
    const order = await ctx.db.get(id);
    if (!order) throw new Error("Order not found");

    // Load items
    const items = await ctx.db
      .query("orderLineItems")
      .withIndex("by_order", (q) => q.eq("orderId", id))
      .collect();

    // Validate stock one more time at checkout to avoid race conditions
    for (const li of items) {
      const product = await ctx.db.get(li.productId);
      const currentStock =
        typeof product?.stock === "number" ? product.stock : 0;
      if (li.quantity > currentStock) {
        throw new Error(
          `Insufficient stock for product ${String(li.productId)}. Requested ${li.quantity}, available ${currentStock}.`,
        );
      }
    }

    // Update product inventory in Convex first
    for (const li of items) {
      const product = await ctx.db.get(li.productId);
      const currentStock =
        typeof product?.stock === "number" ? product.stock : 0;
      const nextStock = Math.max(0, currentStock - li.quantity);
      await ctx.db.patch(li.productId, {
        stock: nextStock,
        checkedOut: Math.max(0, (product?.checkedOut ?? 0) + li.quantity),
        ytdStockUsed: Math.max(0, (product?.ytdStockUsed ?? 0) + li.quantity),
        updatedTime: String(Date.now()),
      });
    }

    // Update order status
    await ctx.db.patch(id, { status: "Check-Out", updatedAt: Date.now() });

    // Schedule Monday sync for orders board and subitems
    try {
      const integration = await ctx.runQuery(
        api.integrations.queries.getByKind,
        {
          kind: "monday",
        },
      );
      console.log("integration", integration);
      const connections = integration
        ? await ctx.runQuery(api.integrations.queries.listConnections, {
            integrationId: integration._id,
          })
        : [];
      console.log("connections", connections);
      const cfg = ((connections ?? [])[0]?.config ?? {}) as {
        enableOrdersSync?: boolean;
        enableInventorySync?: boolean;
        columnMap?: Record<string, unknown>;
      };
      const ordersEnabled =
        (cfg.enableOrdersSync as boolean | undefined) ??
        (cfg.columnMap?.enableOrdersSync as boolean | undefined) ??
        true;
      console.log("ordersEnabled", ordersEnabled);
      if (ordersEnabled) {
        const ref =
          "monday/sync:syncOrderToMonday" as unknown as FunctionReference<"action">;
        await ctx.scheduler.runAfter(0, ref, { orderId: id });
      }

      // Schedule inventory sync for affected products only if enabled
      const inventoryEnabled =
        (cfg.enableInventorySync as boolean | undefined) ??
        (cfg.columnMap?.enableInventorySync as boolean | undefined) ??
        false;
      if (inventoryEnabled) {
        const invRef =
          "monday/inventorySync:syncProductsForOrder" as unknown as FunctionReference<"action">;
        console.log("scheduling inventory sync for order", id);
        await ctx.scheduler.runAfter(0, invRef, { orderId: id });
      }
    } catch {}

    return null;
  },
});

// Check-in mutation: Convex-first reverse adjustments then enqueue Monday sync
export const checkin = mutation({
  args: { id: v.id("orders") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const order = await ctx.db.get(id);
    if (!order) throw new Error("Order not found");

    const items = await ctx.db
      .query("orderLineItems")
      .withIndex("by_order", (q) => q.eq("orderId", id))
      .collect();

    for (const li of items) {
      const product = await ctx.db.get(li.productId);
      const currentStock =
        typeof product?.stock === "number" ? product.stock : 0;
      const nextStock = currentStock + li.quantity;
      await ctx.db.patch(li.productId, {
        stock: nextStock,
        checkedOut: Math.max(0, (product?.checkedOut ?? 0) - li.quantity),
        updatedTime: String(Date.now()),
      });
    }

    await ctx.db.patch(id, { status: "Check-In", updatedAt: Date.now() });

    const ref =
      "monday/sync:syncOrderToMonday" as unknown as FunctionReference<"action">;
    await ctx.scheduler.runAfter(0, ref, { orderId: id });

    const invRef =
      "monday/inventorySync:syncProductsForOrder" as unknown as FunctionReference<"action">;
    await ctx.scheduler.runAfter(0, invRef, { orderId: id });

    return null;
  },
});

export const bulkDelete = mutation({
  args: { ids: v.array(v.id("orders")) },
  returns: v.null(),
  handler: async (ctx, { ids }) => {
    for (const id of ids) {
      const items = await ctx.db
        .query("orderLineItems")
        .withIndex("by_order", (q) => q.eq("orderId", id))
        .collect();
      for (const li of items) {
        await ctx.db.delete(li._id);
      }
      await ctx.db.delete(id);
    }
    return null;
  },
});

export const removeByMondayItemId = mutation({
  args: { mondayItemId: v.string() },
  returns: v.null(),
  handler: async (ctx, { mondayItemId }) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_mondayItemId", (q) => q.eq("mondayItemId", mondayItemId))
      .first();
    if (order) {
      // delete line items
      const items = await ctx.db
        .query("orderLineItems")
        .withIndex("by_order", (q) => q.eq("orderId", order._id))
        .collect();
      for (const li of items) await ctx.db.delete(li._id);
      await ctx.db.delete(order._id);
    }
    return null;
  },
});
