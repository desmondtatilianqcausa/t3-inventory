"use node";

import { api, internal } from "../_generated/api";

import { action } from "../_generated/server";
import { v } from "convex/values";

export const syncProductsForOrder = action({
  args: { orderId: v.id("orders") },
  returns: v.null(),
  handler: async (ctx, { orderId }) => {
    // Load Monday integration and connection
    const integration = await ctx.runQuery(api.integrations.queries.getByKind, {
      kind: "monday",
    });
    if (!integration) return null;
    const connections = await ctx.runQuery(
      api.integrations.queries.listConnections,
      { integrationId: integration._id },
    );
    if ((connections ?? []).length === 0) return null;
    const conn = (connections ?? [])[0];
    const cfg = (conn?.config ?? {}) as {
      apiToken?: string;
      inventoryBoardId?: number;
      columnMap?: Record<string, unknown>;
      enableInventorySync?: boolean;
    };
    const inventoryEnabled =
      (cfg.enableInventorySync as boolean | undefined) ??
      (cfg.columnMap?.enableInventorySync as boolean | undefined) ??
      true;
    if (!inventoryEnabled) return null;
    if (!cfg.apiToken || typeof cfg.inventoryBoardId !== "number") return null;

    // Get items for order
    const items = await ctx.runQuery(api.orders.queries.listLineItems, {
      orderId,
    });

    // Build column id map
    const colMap = (cfg.columnMap ?? {}) as Record<string, string>;
    const stockCol = String(colMap.inventoryStockColumnId ?? "");
    const checkedOutCol = String(colMap.inventoryCheckedOutColumnId ?? "");
    const restockTriggerCol = String(
      colMap.inventoryRestockTriggerColumnId ?? "",
    );

    // Sync each product's inventory metrics to inventory board
    for (const li of items ?? []) {
      const product = await ctx.runQuery(api.products.queries.getById, {
        id: li.productId,
      });
      if (!product) continue;

      const mondayItemId = product.mondayItemId
        ? String(product.mondayItemId)
        : undefined;

      const columnValues: Record<string, unknown> = {};
      if (stockCol) columnValues[stockCol] = product.stock ?? 0;
      if (checkedOutCol) columnValues[checkedOutCol] = product.checkedOut ?? 0;
      if (restockTriggerCol && typeof product.restockTrigger === "number")
        columnValues[restockTriggerCol] = product.restockTrigger;

      if (!mondayItemId) {
        // Create new inventory item for product
        const createdId = await ctx.runAction(api.monday.actions.createItem, {
          config: { apiToken: cfg.apiToken, boardId: cfg.inventoryBoardId },
          name: String(product.name ?? `Product ${String(product._id)}`),
          columnValues,
        });
        await ctx.runMutation(api.products.mutations.setMondayItemId, {
          id: product._id,
          mondayItemId: Number(createdId),
        });
      } else if (Object.keys(columnValues).length > 0) {
        await ctx.runAction(api.monday.actions.updateItem, {
          config: {
            apiToken: cfg.apiToken,
            boardId: cfg.inventoryBoardId,
          },
          itemId: mondayItemId,
          columnValues,
        });
      }
    }

    return null;
  },
});

export const upsertProduct = action({
  args: { productId: v.id("products") },
  returns: v.null(),
  handler: async (ctx, { productId }) => {
    // Load Monday integration and connection
    const integration = await ctx.runQuery(api.integrations.queries.getByKind, {
      kind: "monday",
    });
    if (!integration) return null;
    const connections = await ctx.runQuery(
      api.integrations.queries.listConnections,
      { integrationId: integration._id },
    );
    if ((connections ?? []).length === 0) return null;
    const conn = (connections ?? [])[0];
    const cfg = (conn?.config ?? {}) as {
      apiToken?: string;
      inventoryBoardId?: number;
      columnMap?: Record<string, unknown>;
      enableInventorySync?: boolean;
    };
    const inventoryEnabled =
      (cfg.enableInventorySync as boolean | undefined) ??
      (cfg.columnMap?.enableInventorySync as boolean | undefined) ??
      true;
    if (!inventoryEnabled) return null;
    if (!cfg.apiToken || typeof cfg.inventoryBoardId !== "number") return null;

    const product = await ctx.runQuery(api.products.queries.getById, {
      id: productId,
    });
    if (!product) return null;

    // Resolve target group: category group if set; otherwise ensure Uncategorized group
    let groupId: string | undefined;
    if (product.productCategoryId) {
      const category = await ctx.runQuery(
        api.products.queries.getCategoryById,
        {
          id: product.productCategoryId as any,
        },
      );
      groupId = (category as { mondayGroupId?: string } | null)?.mondayGroupId;
    } else {
      try {
        const uncategorizedId = await ctx.runAction(
          internal.products.actions.ensureUncategorizedCategory,
          {},
        );
        const cat = await ctx.runQuery(api.products.queries.getCategoryById, {
          id: uncategorizedId,
        });
        groupId = (cat as { mondayGroupId?: string } | null)?.mondayGroupId;
      } catch {}
    }

    const name = String(product.name ?? `Product ${String(productId)}`);
    const colVals: Record<string, unknown> = {};

    // Use mapped numbers/status columns only if provided
    const columnMap = (cfg.columnMap ?? {}) as Record<string, unknown>;
    const stockCol = String(columnMap.inventoryStockColumnId ?? "");
    const checkedOutCol = String(columnMap.inventoryCheckedOutColumnId ?? "");
    const restockTriggerCol = String(
      columnMap.inventoryRestockTriggerColumnId ?? "",
    );
    const statusCol = String(columnMap.inventoryStatusColumnId ?? "");

    if (stockCol) colVals[stockCol] = product.stock ?? 0;
    if (checkedOutCol) colVals[checkedOutCol] = product.checkedOut ?? 0;
    if (restockTriggerCol && typeof product.restockTrigger === "number")
      colVals[restockTriggerCol] = product.restockTrigger;
    if (statusCol && product.status)
      colVals[statusCol] = { label: String(product.status) };

    if (!product.mondayItemId) {
      const createdId = await ctx.runAction(api.monday.actions.createItem, {
        config: {
          apiToken: cfg.apiToken,
          boardId: cfg.inventoryBoardId,
          groupId: groupId ?? undefined,
        },
        name,
        columnValues: colVals,
      });
      await ctx.runMutation(api.products.mutations.setMondayItemId, {
        id: productId,
        mondayItemId: Number(createdId),
      });
    } else {
      await ctx.runAction(api.monday.actions.updateItem, {
        config: { apiToken: cfg.apiToken, boardId: cfg.inventoryBoardId },
        itemId: String(product.mondayItemId),
        columnValues: colVals,
      });
      if (groupId) {
        await ctx.runAction(api.monday.actions.moveItemToGroup, {
          config: { apiToken: cfg.apiToken },
          itemId: String(product.mondayItemId),
          groupId,
        });
      }
    }

    return null;
  },
});

export const pullInventoryBoard = action({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Resolve connection and board
    const integration = await ctx.runQuery(api.integrations.queries.getByKind, {
      kind: "monday",
    });
    if (!integration) return null;
    const connections = await ctx.runQuery(
      api.integrations.queries.listConnections,
      { integrationId: integration._id },
    );
    if ((connections ?? []).length === 0) return null;
    const conn = (connections ?? [])[0];
    const cfg = (conn?.config ?? {}) as {
      apiToken?: string;
      inventoryBoardId?: number;
      columnMap?: Record<string, unknown>;
      enableInventorySync?: boolean;
    };
    if (!cfg.enableInventorySync) return null;
    if (!cfg.apiToken || typeof cfg.inventoryBoardId !== "number") return null;

    // Fetch groups and items from Monday
    const groups = await ctx.runAction(api.monday.actions.listBoardGroups, {
      config: { apiToken: cfg.apiToken, boardId: cfg.inventoryBoardId },
    });
    const items = await ctx.runAction(
      api.monday.actions.listBoardItemsWithColumns,
      { config: { apiToken: cfg.apiToken, boardId: cfg.inventoryBoardId } },
    );

    // Map groups -> categories by name
    const existingCategories = await ctx.runQuery(
      api.products.queries.getAllCategories,
      {},
    );
    const nameToCategory = new Map<
      string,
      (typeof existingCategories)[number]
    >();
    for (const c of existingCategories ?? []) {
      nameToCategory.set(String((c as any).name), c as any);
    }

    for (const g of groups ?? []) {
      const rawTitle = String(g.title ?? "");
      const title = rawTitle === "Uncategorized" ? "No Category" : rawTitle;
      const found = nameToCategory.get(title);
      if (found) {
        // Ensure mondayGroupId is stored
        if (!found.mondayGroupId && g.id) {
          await ctx.runMutation(
            api.products.mutations.setCategoryMondayGroupId,
            {
              id: found._id as any,
              mondayGroupId: String(g.id),
            },
          );
        }
      } else {
        // Create category and set mondayGroupId
        const catId = await ctx.runMutation(
          api.products.mutations.createCategory,
          {
            name: title || "No Category",
            description: undefined,
          },
        );
        await ctx.runMutation(api.products.mutations.setCategoryMondayGroupId, {
          id: catId,
          mondayGroupId: String(g.id),
        });
        // refresh map
        nameToCategory.set(title || "No Category", {
          _id: catId,
          name: title || "No Category",
          mondayGroupId: String(g.id),
        } as any);
      }
    }

    // Build column id map for convenience
    const colMap = (cfg.columnMap ?? {}) as Record<string, string>;
    const stockCol = String(colMap.inventoryStockColumnId ?? "");
    const checkedOutCol = String(colMap.inventoryCheckedOutColumnId ?? "");
    const restockTriggerCol = String(
      colMap.inventoryRestockTriggerColumnId ?? "",
    );
    const statusCol = String(colMap.inventoryStatusColumnId ?? "");

    // Helper to read a number column
    const getNum = (cols: Array<{ id: string; text?: string }>, id: string) => {
      if (!id) return undefined;
      const c = cols.find((x) => x.id === id);
      const n = c?.text ? Number(c.text.replace(/,/g, "")) : undefined;
      return Number.isFinite(n) ? (n as number) : undefined;
    };

    // Helper to read a status label
    const getStatus = (
      cols: Array<{ id: string; text?: string }>,
      id: string,
    ) => {
      if (!id) return undefined;
      const c = cols.find((x) => x.id === id);
      return c?.text ? String(c.text) : undefined;
    };

    // Import/overwrite products by item name and link monday item id
    const existingProducts = await ctx.runQuery(
      api.products.queries.getAll,
      {},
    );
    const nameToProduct = new Map<string, (typeof existingProducts)[number]>();
    for (const p of existingProducts ?? []) {
      nameToProduct.set(String((p as any).name), p as any);
    }

    for (const it of items ?? []) {
      const title = String(it.name ?? "");
      if (!title) continue;
      const product = nameToProduct.get(title);
      const groupId = String(it.groupId ?? "");
      // Map group to category id
      let productCategoryId: any = undefined;
      if (groupId) {
        // find by mondayGroupId in categories map
        for (const [name, cat] of nameToCategory) {
          if ((cat as any).mondayGroupId === groupId) {
            productCategoryId = (cat as any)._id;
            break;
          }
        }
      }

      const stock =
        getNum(it.columns as any, stockCol) ?? (product as any)?.stock ?? 0;
      const checkedOut =
        getNum(it.columns as any, checkedOutCol) ??
        (product as any)?.checkedOut ??
        0;
      const restockTrigger =
        getNum(it.columns as any, restockTriggerCol) ??
        (product as any)?.restockTrigger;
      const status =
        getStatus(it.columns as any, statusCol) ?? (product as any)?.status;

      if (product) {
        // Update Convex product and link monday id
        await ctx.runMutation(api.products.mutations.update, {
          id: (product as any)._id,
          stock,
          status: status as any,
          // keep other fields as-is
          productCategoryId: productCategoryId,
        });
        if (!(product as any).mondayItemId) {
          await ctx.runMutation(api.products.mutations.setMondayItemId, {
            id: (product as any)._id,
            mondayItemId: Number(it.id),
          });
        }
      } else {
        // Create new product in Convex linked to Monday
        const newId = await ctx.runMutation(api.products.mutations.create, {
          name: title,
          stock,
          price: 0,
          description: undefined,
          category: undefined,
          productCategoryId,
          status: (status as any) ?? "Draft",
        });
        await ctx.runMutation(api.products.mutations.setMondayItemId, {
          id: newId,
          mondayItemId: Number(it.id),
        });
      }
    }

    return null;
  },
});

export const pullInventoryItem = action({
  args: { itemId: v.string() },
  returns: v.null(),
  handler: async (ctx, { itemId }) => {
    // Resolve connection & config
    const integration = await ctx.runQuery(api.integrations.queries.getByKind, {
      kind: "monday",
    });
    if (!integration) return null;
    const connections = await ctx.runQuery(
      api.integrations.queries.listConnections,
      { integrationId: integration._id },
    );
    if ((connections ?? []).length === 0) return null;
    const conn = (connections ?? [])[0];
    const cfg = (conn?.config ?? {}) as {
      apiToken?: string;
      inventoryBoardId?: number;
      columnMap?: Record<string, unknown>;
      enableInventorySync?: boolean;
    };
    if (!((cfg.enableInventorySync as boolean | undefined) ?? true))
      return null;
    if (!cfg.apiToken || typeof cfg.inventoryBoardId !== "number") return null;

    // Fetch the item with columns
    const item = await ctx.runAction(api.monday.actions.getItemWithColumns, {
      config: { apiToken: cfg.apiToken },
      itemId,
    });

    // Map category by group id
    const existingCategories = await ctx.runQuery(
      api.products.queries.getAllCategories,
      {},
    );
    let productCategoryId: any = undefined;
    if (item.groupId) {
      for (const c of existingCategories ?? []) {
        if ((c as any).mondayGroupId === item.groupId) {
          productCategoryId = (c as any)._id;
          break;
        }
      }
    }

    // Build column id map
    const colMap = (cfg.columnMap ?? {}) as Record<string, string>;
    const stockCol = String(colMap.inventoryStockColumnId ?? "");
    const checkedOutCol = String(colMap.inventoryCheckedOutColumnId ?? "");
    const restockTriggerCol = String(
      colMap.inventoryRestockTriggerColumnId ?? "",
    );
    const statusCol = String(colMap.inventoryStatusColumnId ?? "");

    // Helpers
    const getNum = (id: string) => {
      if (!id) return undefined;
      const c = item.columns.find((x) => x.id === id);
      const n = c?.text ? Number(c.text.replace(/,/g, "")) : undefined;
      return Number.isFinite(n) ? (n as number) : undefined;
    };
    const getStatus = (id: string) => {
      if (!id) return undefined;
      const c = item.columns.find((x) => x.id === id);
      return c?.text ? String(c.text) : undefined;
    };

    // Find product by mondayItemId
    const mondayItemIdNum = Number(item.id);
    const found = (await ctx.runQuery(api.products.queries.getByMondayItemId, {
      mondayItemId: mondayItemIdNum,
    })) as any;

    // Upsert
    if (found) {
      await ctx.runMutation(api.products.mutations.update, {
        id: found._id,
        name: item.name ?? found.name,
        stock: getNum(stockCol),
        checkedOut: getNum(checkedOutCol) as any,
        restockTrigger: getNum(restockTriggerCol) as any,
        status: getStatus(statusCol) as any,
        productCategoryId,
      } as any);
    } else {
      const newId = await ctx.runMutation(api.products.mutations.create, {
        name: String(item.name ?? `Product ${item.id}`),
        description: undefined,
        stock: getNum(stockCol) ?? 0,
        price: 0,
        status: (getStatus(statusCol) as any) ?? "Draft",
        category: undefined,
        productCategoryId,
      });
      await ctx.runMutation(api.products.mutations.setMondayItemId, {
        id: newId,
        mondayItemId: mondayItemIdNum,
      });
    }

    return null;
  },
});
