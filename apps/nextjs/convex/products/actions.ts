"use node";

import { v } from "convex/values";

import { api, internal } from "../_generated/api";
import { internalAction } from "../_generated/server";

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
