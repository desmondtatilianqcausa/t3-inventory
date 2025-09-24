"use node";

import { v } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import { api } from "../_generated/api";
import { action } from "../_generated/server";

function pickConnection(conns: Array<{ config?: unknown }>) {
  for (const c of conns) {
    const cfg = (c.config ?? {}) as { isDefault?: boolean };
    if (cfg && cfg.isDefault) return c;
  }
  return conns[0];
}

export const syncOrderToMonday = action({
  args: { orderId: v.id("orders") },
  returns: v.null(),
  handler: async (ctx, { orderId }) => {
    // Load Monday integration and a connection
    console.log("syncOrderToMonday orderId", orderId);
    const integration = await ctx.runQuery(api.integrations.queries.getByKind, {
      kind: "monday",
    });
    if (!integration) return null;

    const connections = await ctx.runQuery(
      api.integrations.queries.listConnections,
      { integrationId: integration._id },
    );
    if ((connections ?? []).length === 0) return null;

    const conn = pickConnection(connections ?? []);
    const cfg = (conn?.config ?? {}) as {
      apiToken?: string;
      ordersBoardId?: number;
      groupId?: string;
      columnMap?: Record<string, unknown>;
      enableOrdersSync?: boolean;
    };
    console.log("cfg", cfg);
    const ordersEnabled =
      (cfg.enableOrdersSync as boolean | undefined) ??
      (cfg.columnMap?.enableOrdersSync as boolean | undefined) ??
      true;
    if (!ordersEnabled) return null;
    if (!cfg.apiToken || typeof cfg.ordersBoardId !== "number") return null;

    // Load the order
    const order = await ctx.runQuery(api.orders.queries.getById, {
      id: orderId,
    });
    console.log("order", order);
    if (!order) return null;

    // Only sync orders that are checked out/in
    const status = String(order.status ?? "");
    console.log("status", status);
    if (status !== "Check-Out" && status !== "Check-In") return null;

    // Compose column values for Monday (status only unless mapped extras are added later)
    const statusCol = String(
      (cfg.columnMap?.ordersStatusColumnId as string | undefined) ?? "",
    );
    const eventCol = String(
      (cfg.columnMap?.ordersEventColumnId as string | undefined) ?? "",
    );
    const orderColumns: Record<string, unknown> = {};
    if (statusCol) orderColumns[statusCol] = { label: status };
    if (eventCol && order.eventId) {
      try {
        const ev = await ctx.runQuery(api.events.queries.getById, {
          id: order.eventId as Id<"events">,
        });
        const eventTitle = (ev as { title?: unknown } | null)?.title;
        if (typeof eventTitle === "string" && eventTitle.trim()) {
          orderColumns[eventCol] = eventTitle;
        }
      } catch {}
    }

    // Ensure a top-level Monday item exists or update it
    let mondayItemId: string | undefined = order.mondayItemId ?? undefined;
    if (!mondayItemId) {
      mondayItemId = await ctx.runAction(api.monday.actions.createItem, {
        config: {
          apiToken: cfg.apiToken,
          boardId: cfg.ordersBoardId,
          groupId: cfg.groupId,
        },
        name: `Order ${String(orderId)}`,
        columnValues: orderColumns,
      });
      await ctx.runMutation(api.orders.mutations.setMondayItemId, {
        id: orderId,
        mondayItemId,
      });
    } else if (Object.keys(orderColumns).length > 0) {
      await ctx.runAction(api.monday.actions.updateItem, {
        config: { apiToken: cfg.apiToken, boardId: cfg.ordersBoardId },
        itemId: mondayItemId,
        columnValues: orderColumns,
      });
    }

    // Sync subitems for each line item
    const items = await ctx.runQuery(api.orders.queries.listLineItems, {
      orderId,
    });

    for (const li of items ?? []) {
      const titleCandidate =
        (typeof li.productName === "string" ? li.productName : undefined) ??
        (await (async () => {
          const p = await ctx.runQuery(api.products.queries.getById, {
            id: li.productId,
          });
          return typeof p?.name === "string"
            ? p.name
            : `Product ${String(li.productId)}`;
        })());

      // Use mapped subitem quantity columns from config
      const checkoutCol = String(
        (cfg.columnMap?.orderSubitemCheckoutQuantityColumnId as
          | string
          | undefined) ?? "",
      );
      const checkinCol = String(
        (cfg.columnMap?.orderSubitemCheckinQuantityColumnId as
          | string
          | undefined) ?? "",
      );
      const skuCol = String(
        (cfg.columnMap?.orderSubitemSkuColumnId as string | undefined) ?? "",
      );
      const subColumns: Record<string, unknown> = {};
      if (status === "Check-In") {
        if (checkinCol) subColumns[checkinCol] = li.quantity;
      } else {
        if (checkoutCol) subColumns[checkoutCol] = li.quantity;
      }
      // Insert SKU as product monday item id if mapped and available
      if (skuCol) {
        const product = await ctx.runQuery(api.products.queries.getById, {
          id: li.productId,
        });
        if (product?.mondayItemId) {
          subColumns[skuCol] = String(product.mondayItemId);
        }
      }

      if (!li.mondaySubitemId) {
        // Try to find existing subitem by name first to avoid duplicates
        let existingSubId: string | undefined = undefined;
        if (mondayItemId) {
          const subs = await ctx.runAction(api.monday.actions.listSubitems, {
            config: { apiToken: cfg.apiToken },
            parentItemId: mondayItemId,
          });
          const match = (subs ?? []).find(
            (s) => (s.name ?? "") === (titleCandidate ?? ""),
          );
          existingSubId = match?.id;
        }

        let targetSubId: string;
        if (existingSubId) {
          targetSubId = existingSubId;
        } else {
          const created = await ctx.runAction(
            api.monday.actions.createSubitem,
            {
              config: { apiToken: cfg.apiToken },
              parentItemId: mondayItemId ?? "",
              name: titleCandidate,
              columnValues: subColumns,
            },
          );
          targetSubId = created.id;
        }

        await ctx.runMutation(api.orders.mutations.setLineItemMondayId, {
          id: li._id,
          mondaySubitemId: targetSubId,
        });
        // Ensure values
        if (Object.keys(subColumns).length > 0) {
          await ctx.runAction(api.monday.actions.updateSubitem, {
            config: { apiToken: cfg.apiToken },
            itemId: targetSubId,
            columnValues: subColumns,
          });
        }
      } else {
        await ctx.runAction(api.monday.actions.updateSubitem, {
          config: { apiToken: cfg.apiToken },
          itemId: li.mondaySubitemId,
          columnValues: subColumns,
        });
      }
    }

    return null;
  },
});
