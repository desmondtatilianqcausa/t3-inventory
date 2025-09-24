import { query } from "../_generated/server";
import { v } from "convex/values";

export const getAll = query({
  args: {},
  handler: async (ctx) => ctx.db.query("products").order("desc").collect(),
});

export const getById = query({
  args: { id: v.id("products") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const listByCategoryId = query({
  args: { productCategoryId: v.id("productCategories") },
  handler: async (ctx, args) =>
    ctx.db
      .query("products")
      .withIndex("by_productCategory", (q) =>
        q.eq("productCategoryId", args.productCategoryId),
      )
      .collect(),
});

export const getAllCategories = query({
  args: {},
  handler: async (ctx) =>
    ctx.db.query("productCategories").order("desc").collect(),
});

export const getCategoryBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) =>
    ctx.db
      .query("productCategories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first(),
});

export const getCategoryById = query({
  args: { id: v.id("productCategories") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});
