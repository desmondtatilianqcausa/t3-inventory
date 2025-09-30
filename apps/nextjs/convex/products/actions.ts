"use node";

import { action, internalAction } from "../_generated/server";
import { api, internal } from "../_generated/api";

import { v } from "convex/values";

export const ensureCategoryGroup = internalAction({
  args: { categoryId: v.id("productCategories") },
  returns: v.null(),
  handler: async (ctx, { categoryId }) => {
    const integration = await ctx.runQuery(api.integrations.queries.getByKind, {
      kind: "monday",
    });
    if (!integration) return null;
    const connections = await ctx.runQuery(
      api.integrations.queries.listConnections,
      { integrationId: integration._id },
    );
    const conn = (connections ?? [])[0];
    const cfg = (conn?.config ?? {}) as {
      apiToken?: string;
      inventoryBoardId?: number;
    };
    if (!cfg.apiToken || typeof cfg.inventoryBoardId !== "number") return null;

    const category = await ctx.runQuery(api.products.queries.getCategoryById, {
      id: categoryId,
    });
    if (!category) return null;
    if (category.mondayGroupId) return null;

    const groupName = String(
      (category.name as string) === "No Category"
        ? "Uncategorized"
        : category.name,
    );

    const created = await ctx.runAction(api.monday.actions.createGroup, {
      config: { apiToken: cfg.apiToken, boardId: cfg.inventoryBoardId },
      groupName,
    });
    await ctx.runMutation(api.products.mutations.setCategoryMondayGroupId, {
      id: categoryId,
      mondayGroupId: created.id,
    });
    return null;
  },
});

export const moveProductToCategoryGroup = internalAction({
  args: { productId: v.id("products"), categoryId: v.id("productCategories") },
  returns: v.null(),
  handler: async (ctx, { productId, categoryId }) => {
    const product = await ctx.runQuery(api.products.queries.getById, {
      id: productId,
    });
    const category = await ctx.runQuery(api.products.queries.getCategoryById, {
      id: categoryId,
    });
    const groupId = (category as { mondayGroupId?: string } | null)
      ?.mondayGroupId;
    const mondayItemId = product?.mondayItemId
      ? String(product.mondayItemId)
      : undefined;
    if (!groupId || !mondayItemId) return null;

    const integration = await ctx.runQuery(api.integrations.queries.getByKind, {
      kind: "monday",
    });
    if (!integration) return null;
    const connections = await ctx.runQuery(
      api.integrations.queries.listConnections,
      { integrationId: integration._id },
    );
    const conn = (connections ?? [])[0];
    const cfg = (conn?.config ?? {}) as { apiToken?: string };
    if (!cfg.apiToken) return null;

    await ctx.runAction(api.monday.actions.moveItemToGroup, {
      config: { apiToken: cfg.apiToken },
      itemId: mondayItemId,
      groupId,
    });
    return null;
  },
});

export const ensureUncategorizedCategory = internalAction({
  args: {},
  returns: v.id("productCategories"),
  handler: async (ctx) => {
    // Try to find by slug first
    const existing = await ctx.runQuery(
      api.products.queries.getCategoryBySlug,
      {
        slug: "no-category",
      },
    );
    if (existing?._id) {
      await ctx.runAction(internal.products.actions.ensureCategoryGroup, {
        categoryId: existing._id,
      });
      return existing._id;
    }
    // Create the 'No Category' category
    const id = await ctx.runMutation(api.products.mutations.createCategory, {
      name: "No Category",
      slug: "no-category",
      description: "Default category for uncategorized products",
    });
    await ctx.runAction(internal.products.actions.ensureCategoryGroup, {
      categoryId: id,
    });
    return id;
  },
});

export const moveProductToUncategorized = internalAction({
  args: { productId: v.id("products") },
  returns: v.null(),
  handler: async (ctx, { productId }) => {
    const uncategorizedId = await ctx.runAction(
      internal.products.actions.ensureUncategorizedCategory,
      {},
    );
    await ctx.runAction(internal.products.actions.moveProductToCategoryGroup, {
      productId,
      categoryId: uncategorizedId,
    });
    return null;
  },
});

export const getImageUrl = action({
  args: { productId: v.id("products") },
  returns: v.union(
    v.object({ url: v.string(), expiresAt: v.number() }),
    v.null(),
  ),
  handler: async (ctx, { productId }) => {
    const product = await ctx.runQuery(api.products.queries.getById, {
      id: productId,
    });
    console.log("[MONDAY] getImageUrl", { product });
    if (!product) return null;
    const now = Date.now();
    if (
      typeof (product as any).featuredImageUrl === "string" &&
      typeof (product as any).featuredImageUrlExpiresAt === "number" &&
      (product as any).featuredImageUrlExpiresAt > now
    ) {
      return {
        url: (product as any).featuredImageUrl as string,
        expiresAt: (product as any).featuredImageUrlExpiresAt as number,
      };
    }

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
      columnMap?: Record<string, unknown>;
      inventoryImageFileColumnId?: string;
    };
    const apiToken = cfg.apiToken;
    const fileColId =
      String((cfg.columnMap as any)?.inventoryImageFileColumnId ?? "") ||
      String(cfg.inventoryImageFileColumnId ?? "");
    if (!apiToken || !fileColId) return null;

    const mondayItemId = (product as any).mondayItemId as number | undefined;
    console.log("[MONDAY] mondayItemId", { mondayItemId });
    if (!mondayItemId) return null;

    const publicUrl = await ctx.runAction(
      api.monday.actions.getItemFilePublicUrl,
      {
        config: { apiToken },
        itemId: String(mondayItemId),
        fileColumnId: fileColId,
      },
    );
    if (typeof publicUrl === "string" && publicUrl) {
      const expiresAt = now + 55 * 60 * 1000;
      await ctx.runMutation(api.products.mutations.update, {
        id: productId,
        // store cache in product
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        featuredImageUrl: publicUrl as any,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        featuredImageUrlExpiresAt: expiresAt as any,
      });
      return { url: publicUrl, expiresAt };
    }
    return null;
  },
});
