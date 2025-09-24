import type { FunctionReference } from "convex/server";
import { v } from "convex/values";

import { api, internal } from "../_generated/api";
import { mutation } from "../_generated/server";
import { slugify } from "../events/helpers";

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    stock: v.number(),
    price: v.number(),
    category: v.optional(v.string()),
    productCategoryId: v.optional(v.id("productCategories")),
    status: v.optional(v.string()), // Draft | Published | Removed
  },
  returns: v.id("products"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("products", {
      name: args.name,
      description: args.description,
      stock: args.stock,
      price: args.price,
      category: args.category,
      // Some generated data models prefer null over undefined for optional Id unions
      // Use null when productCategoryId is not provided
      productCategoryId: args.productCategoryId ?? null,
      status: args.status ?? "Draft",
    });

    // Do not sync to Monday here; products start as Draft and only sync when Published
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("products"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    stock: v.optional(v.number()),
    price: v.optional(v.number()),
    category: v.optional(v.string()),
    productCategoryId: v.optional(v.id("productCategories")),
    status: v.optional(v.string()), // Draft | Published | Removed
  },
  returns: v.null(),
  handler: async (ctx, { id, ...rest }) => {
    const existing = await ctx.db.get(id);
    await ctx.db.patch(id, { ...rest });

    // Sync to Monday whenever the product is (or becomes) Published
    const finalStatus = (rest.status ?? existing?.status) as string | undefined;
    if (finalStatus === "Published") {
      await ctx.scheduler.runAfter(0, api.monday.inventorySync.upsertProduct, {
        productId: id,
      });
    }

    return null;
  },
});

export const updatestock = mutation({
  args: { id: v.id("products"), stock: v.number() },
  handler: async (ctx, { id, stock }) => {
    await ctx.db.patch(id, { stock });
    return id;
  },
});

export const createCategory = mutation({
  args: {
    name: v.string(),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    categoryColor: v.optional(v.string()),
  },
  returns: v.id("productCategories"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const base = slugify((args.slug ?? args.name).trim());
    const existing = await ctx.db
      .query("productCategories")
      .withIndex("by_slug", (q) => q.eq("slug", base))
      .first();
    const finalSlug = existing ? `${base}-${now}` : base;

    const categoryId = await ctx.db.insert("productCategories", {
      name: args.name,
      slug: finalSlug,
      description: args.description,
      categoryColor: args.categoryColor,
      updatedAt: now,
    });
    // Ensure a Monday group is created in the background
    await ctx.scheduler.runAfter(
      0,
      internal.products.actions.ensureCategoryGroup,
      {
        categoryId,
      },
    );
    return categoryId;
  },
});

export const updateCategory = mutation({
  args: {
    id: v.id("productCategories"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    categoryColor: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, slug, name, ...rest } = args;
    const patch: Record<string, unknown> = { ...rest, updatedAt: Date.now() };

    if (slug !== undefined) {
      let newSlug = slug.trim() ? slugify(slug) : undefined;
      if (newSlug) {
        const existing = await ctx.db
          .query("productCategories")
          .withIndex("by_slug", (q) => q.eq("slug", newSlug!))
          .first();
        if (existing && existing._id !== id) {
          newSlug = `${newSlug}-${Date.now()}`;
        }
        patch.slug = newSlug;
      }
    }

    if (name !== undefined) {
      patch.name = name;
    }

    await ctx.db.patch(id, patch);
    return null;
  },
});

export const setCategoryMondayGroupId = mutation({
  args: { id: v.id("productCategories"), mondayGroupId: v.string() },
  returns: v.null(),
  handler: async (ctx, { id, mondayGroupId }) => {
    await ctx.db.patch(id, { mondayGroupId, updatedAt: Date.now() });
    return null;
  },
});

export const deleteCategory = mutation({
  args: { id: v.id("productCategories") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
});

export const setProductCategory = mutation({
  args: {
    productId: v.id("products"),
    productCategoryId: v.optional(v.id("productCategories")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.productId, {
      productCategoryId: args.productCategoryId,
    });
    if (args.productCategoryId) {
      await ctx.scheduler.runAfter(
        0,
        internal.products.actions.moveProductToCategoryGroup,
        { productId: args.productId, categoryId: args.productCategoryId },
      );
    }
    return null;
  },
});

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const url = await ctx.storage.generateUploadUrl();
    return url;
  },
});

export const setFeaturedImage = mutation({
  args: {
    productId: v.id("products"),
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, { productId, storageId }) => {
    const url = await ctx.storage.getUrl(storageId);
    await ctx.db.patch(productId, {
      featuredImageId: storageId,
      ...(url ? { featuredImageUrl: url } : {}),
    });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("products") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
    return null;
  },
});

export const setMondayItemId = mutation({
  args: { id: v.id("products"), mondayItemId: v.number() },
  returns: v.null(),
  handler: async (ctx, { id, mondayItemId }) => {
    await ctx.db.patch(id, { mondayItemId });
    return null;
  },
});
